process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/spotq_test';
process.env.REDIS_URL = 'redis://localhost:6379';

import type { Request, Response } from 'express';
import request from 'supertest';
import app from '../src/app.ts';
import type { IQueueCacheService } from '../src/application/ports/cache/queue-cache.port.ts';
import type { IEtaService } from '../src/application/ports/services/eta-service.port.ts';
import type { IRestaurantServiceClient } from '../src/application/ports/services/restaurant-service.port.ts';
import type { IWebSocketBroadcaster } from '../src/application/ports/services/websocket-broadcaster.port.ts';
import type { IGetQueueEtaUseCase } from '../src/application/ports/use-cases/get-queue-eta.use-case.port.ts';
import type { IRegisterQueueUseCase } from '../src/application/ports/use-cases/register-queue.use-case.port.ts';
import { RegisterQueueUseCase } from '../src/application/use-cases/register-queue.use-case.ts';
import { container, TYPES } from '../src/di/index.ts';
import {
	ActiveQueueEntryExistsError,
	ActiveUserQueueEntryExistsError,
	QueueEntry,
	RegistrationType,
	RestaurantNotAcceptingQueueError,
	TableAvailableError,
} from '../src/domain/index.ts';
import type { IQueueRepository } from '../src/domain/repositories/queue.repository.interface.ts';
import { CustomerQueueController } from '../src/presentation/http/controllers/customer-queue.controller.ts';
import {
	type JoinQueueParams,
	joinQueueBodySchema,
} from '../src/presentation/http/validators/join-queue.validator.ts';
import {
	HTTP_STATUS,
	PARTY_SIZE_LIMITS,
	QUEUE_MESSAGES,
	WEBSOCKET_PATHS,
	WEBSOCKET_ROOMS,
	WS_CLIENT_EVENTS,
	WS_SERVER_EVENTS,
} from '../src/shared/index.ts';

describe('Customer Join Queue - SCRUM-975 Test Suite', () => {
	const validRestaurantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
	const validUserId = 'b1ffcd88-8b1a-4fe7-aa5c-5bb8ad270a22';
	const joinEndpoint = `/customer/restaurants/${validRestaurantId}/queue/join`;

	describe('DI Container Resolution', () => {
		it('should resolve CustomerQueueController with joinQueue method', () => {
			const controller = container.get<CustomerQueueController>(
				TYPES.Controllers.CustomerQueueController,
			);
			expect(controller).toBeDefined();
			expect(controller).toBeInstanceOf(CustomerQueueController);
			expect(typeof controller.joinQueue).toBe('function');
		});
	});

	describe('CustomerQueueController.joinQueue Unit Tests', () => {
		let mockRegisterQueueUseCase: jest.Mocked<IRegisterQueueUseCase>;
		let mockGetQueueEtaUseCase: jest.Mocked<IGetQueueEtaUseCase>;
		let controller: CustomerQueueController;
		let mockReq: Partial<Request>;
		let mockRes: Partial<Response>;

		beforeEach(() => {
			mockRegisterQueueUseCase = {
				execute: jest.fn().mockResolvedValue({
					queueEntryId: 'ticket-uuid-123',
					restaurantId: validRestaurantId,
					userId: validUserId,
					guestName: 'Alex Mercer',
					guestPhone: '+15551234567',
					partySize: 3,
					specialNotes: 'Window seat preferred',
					registrationType: RegistrationType.ONLINE,
					position: 4,
					estimatedWaitMinutes: 20,
					status: 'WAITING',
					joinedAt: new Date().toISOString(),
				}),
			};
			mockGetQueueEtaUseCase = {
				execute: jest.fn(),
			};

			controller = new CustomerQueueController(mockGetQueueEtaUseCase, mockRegisterQueueUseCase);

			mockRes = {
				status: jest.fn().mockReturnThis(),
				json: jest.fn().mockReturnThis(),
			};
		});

		it('should execute RegisterQueueUseCase with ONLINE registration type and return 201 with websocket metadata', async () => {
			mockReq = {
				params: { restaurantId: validRestaurantId } as unknown as JoinQueueParams,
				body: {
					guestName: 'Alex Mercer',
					guestPhone: '+15551234567',
					partySize: 3,
					specialNotes: 'Window seat preferred',
					fid: 'fcm-token-xyz',
				},
				userId: validUserId,
			};

			await controller.joinQueue(mockReq as Request, mockRes as Response);

			expect(mockRegisterQueueUseCase.execute).toHaveBeenCalledWith({
				restaurantId: validRestaurantId,
				userId: validUserId,
				guestName: 'Alex Mercer',
				guestPhone: '+15551234567',
				partySize: 3,
				specialNotes: 'Window seat preferred',
				fid: 'fcm-token-xyz',
				registrationType: RegistrationType.ONLINE,
			});

			expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					statusCode: HTTP_STATUS.CREATED,
					message: QUEUE_MESSAGES.JOIN_QUEUE_SUCCESS,
					data: expect.objectContaining({
						queueEntryId: 'ticket-uuid-123',
						restaurantId: validRestaurantId,
						userId: validUserId,
						guestName: 'Alex Mercer',
						position: 4,
						estimatedWaitMinutes: 20,
						websocket: {
							path: WEBSOCKET_PATHS.GATEWAY_QUEUES,
							room: WEBSOCKET_ROOMS.ticket('ticket-uuid-123'),
							ticketId: 'ticket-uuid-123',
							subscribeEvent: WS_CLIENT_EVENTS.JOIN_TICKET,
							updateEvent: WS_SERVER_EVENTS.QUEUE_POSITION_UPDATED,
						},
					}),
				}),
			);
		});
	});

	describe('RegisterQueueUseCase Duplicate Detection Tests', () => {
		let mockQueueRepository: jest.Mocked<IQueueRepository>;
		let mockRestaurantServiceClient: jest.Mocked<IRestaurantServiceClient>;
		let mockEtaService: jest.Mocked<IEtaService>;
		let mockQueueCacheService: jest.Mocked<IQueueCacheService>;
		let mockWebSocketBroadcaster: jest.Mocked<IWebSocketBroadcaster>;
		let useCase: RegisterQueueUseCase;

		beforeEach(() => {
			mockQueueRepository = {
				findById: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
				delete: jest.fn(),
				save: jest.fn(),
				findPaginated: jest.fn(),
				findActiveEntries: jest.fn(),
				countActiveAhead: jest.fn().mockResolvedValue(2),
				sumPartySizeActiveAhead: jest.fn().mockResolvedValue(6),
				getActiveQueueMetrics: jest.fn().mockResolvedValue({ queueDepth: 2, totalPeopleAhead: 6 }),
				countToday: jest.fn().mockResolvedValue(5),
				findActiveByPhone: jest.fn().mockResolvedValue(null),
				findActiveByUserId: jest.fn().mockResolvedValue(null),
				findActiveByRestaurantAndUserId: jest.fn().mockResolvedValue(null),
				createWithHistory: jest
					.fn()
					.mockImplementation((entry: QueueEntry) => Promise.resolve(entry)),
				assignTablesWithHistory: jest.fn(),
			};

			mockRestaurantServiceClient = {
				checkAvailability: jest.fn().mockResolvedValue({
					restaurantId: validRestaurantId,
					isOpen: true,
					acceptsQueue: true,
					isTableAvailable: false,
					availableCount: 0,
					tables: [],
				}),
				getRestaurantStatus: jest.fn().mockResolvedValue({
					restaurantId: validRestaurantId,
					isBlocked: false,
					blockReason: null,
					isSubscriptionActive: true,
					subscriptionPlanCode: 'QUEUE_PRO',
					status: 'ACTIVE',
				}),
				assignTables: jest.fn().mockResolvedValue(undefined),
			};

			mockEtaService = {
				predictEta: jest.fn().mockResolvedValue(15),
			};

			mockQueueCacheService = {
				saveLiveEntry: jest.fn().mockResolvedValue(undefined),
				getLiveEntry: jest.fn().mockResolvedValue(null),
				removeLiveEntry: jest.fn().mockResolvedValue(undefined),
			};

			mockWebSocketBroadcaster = {
				broadcastToRestaurant: jest.fn(),
				broadcastToQueue: jest.fn(),
				sendToTicket: jest.fn(),
			};

			useCase = new RegisterQueueUseCase(
				mockQueueRepository,
				mockRestaurantServiceClient,
				mockEtaService,
				mockQueueCacheService,
				mockWebSocketBroadcaster,
			);
		});

		it('should reject with ActiveUserQueueEntryExistsError when customer with userId is already queued', async () => {
			mockQueueRepository.findActiveByUserId.mockResolvedValueOnce(
				QueueEntry.create({
					restaurantId: validRestaurantId,
					userId: validUserId,
					guestName: 'Alex Mercer',
					phone: '+15551234567',
					queueNumber: 'Q-001',
					partySize: 2,
					position: 1,
					estimatedWaitMinutes: 5,
					registrationType: RegistrationType.ONLINE,
				}),
			);

			await expect(
				useCase.execute({
					restaurantId: validRestaurantId,
					userId: validUserId,
					guestName: 'Alex Mercer',
					guestPhone: '+15559998877',
					partySize: 2,
					registrationType: RegistrationType.ONLINE,
				}),
			).rejects.toThrow(ActiveUserQueueEntryExistsError);

			expect(mockQueueRepository.findActiveByUserId).toHaveBeenCalledWith(validUserId);
			expect(mockQueueRepository.createWithHistory).not.toHaveBeenCalled();
		});

		it('should reject with ActiveUserQueueEntryExistsError when customer already has an active queue entry at another restaurant', async () => {
			const anotherRestaurantId = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
			mockQueueRepository.findActiveByUserId.mockResolvedValueOnce(
				QueueEntry.create({
					restaurantId: anotherRestaurantId,
					userId: validUserId,
					guestName: 'Alex Mercer',
					phone: '+15551234567',
					queueNumber: 'Q-004',
					partySize: 2,
					position: 2,
					estimatedWaitMinutes: 10,
					registrationType: RegistrationType.ONLINE,
				}),
			);

			await expect(
				useCase.execute({
					restaurantId: validRestaurantId,
					userId: validUserId,
					guestName: 'Alex Mercer',
					guestPhone: '+15559998877',
					partySize: 2,
					registrationType: RegistrationType.ONLINE,
				}),
			).rejects.toThrow(ActiveUserQueueEntryExistsError);

			expect(mockQueueRepository.findActiveByUserId).toHaveBeenCalledWith(validUserId);
			expect(mockQueueRepository.createWithHistory).not.toHaveBeenCalled();
		});

		it('should reject with ActiveQueueEntryExistsError when customer phone is already queued', async () => {
			mockQueueRepository.findActiveByPhone.mockResolvedValueOnce(
				QueueEntry.create({
					restaurantId: validRestaurantId,
					userId: 'another-user',
					guestName: 'Prior Guest',
					phone: '+15551234567',
					queueNumber: 'Q-002',
					partySize: 2,
					position: 1,
					estimatedWaitMinutes: 5,
					registrationType: RegistrationType.ONLINE,
				}),
			);

			await expect(
				useCase.execute({
					restaurantId: validRestaurantId,
					userId: validUserId,
					guestName: 'Alex Mercer',
					guestPhone: '+15551234567',
					partySize: 2,
					registrationType: RegistrationType.ONLINE,
				}),
			).rejects.toThrow(ActiveQueueEntryExistsError);

			expect(mockQueueRepository.createWithHistory).not.toHaveBeenCalled();
		});

		it('should persist fid on QueueEntry creation', async () => {
			const result = await useCase.execute({
				restaurantId: validRestaurantId,
				userId: validUserId,
				guestName: 'Alex Mercer',
				guestPhone: '+15551234567',
				partySize: 2,
				fid: 'fcm-device-test-token',
				registrationType: RegistrationType.ONLINE,
			});

			expect(result.position).toBe(3);
			expect(mockQueueRepository.createWithHistory).toHaveBeenCalledTimes(1);
			const createdEntry = mockQueueRepository.createWithHistory.mock.calls[0][0];
			expect(createdEntry.fid).toBe('fcm-device-test-token');
			expect(createdEntry.queueNumber).toBe('Q-006');
		});
	});

	describe('HTTP Request Validation & Authentication Tests', () => {
		const validBody = {
			guestName: 'Alex Mercer',
			guestPhone: '+15551234567',
			partySize: 2,
			specialNotes: 'Quiet booth if possible',
			fid: 'token-abc',
		};

		it('should return 401 Unauthorized when x-user-id header is missing', async () => {
			const res = await request(app).post(joinEndpoint).send(validBody);

			expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
			expect(res.body.success).toBe(false);
			expect(res.body.code).toBe('UNAUTHORIZED');
		});

		it('should return 400 Bad Request when restaurantId is not a valid UUID', async () => {
			const res = await request(app)
				.post('/customer/restaurants/invalid-uuid-123/queue/join')
				.set('x-user-id', validUserId)
				.send(validBody);

			expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
			expect(res.body.success).toBe(false);
			expect(res.body.code).toBe('INVALID_PARAMETERS');
		});

		it('should return 400 Bad Request when guestPhone is not E.164 format', async () => {
			const res = await request(app)
				.post(joinEndpoint)
				.set('x-user-id', validUserId)
				.send({
					...validBody,
					guestPhone: '5551234567', // Missing + country code
				});

			expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
			expect(res.body.success).toBe(false);
			expect(res.body.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 Bad Request when partySize is less than 1', async () => {
			const res = await request(app)
				.post(joinEndpoint)
				.set('x-user-id', validUserId)
				.send({
					...validBody,
					partySize: PARTY_SIZE_LIMITS.MIN - 1,
				});

			expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
			expect(res.body.success).toBe(false);
			expect(res.body.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 Bad Request when partySize exceeds 20', async () => {
			const res = await request(app)
				.post(joinEndpoint)
				.set('x-user-id', validUserId)
				.send({
					...validBody,
					partySize: PARTY_SIZE_LIMITS.MAX + 1,
				});

			expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
			expect(res.body.success).toBe(false);
			expect(res.body.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 Bad Request when guestName is empty', async () => {
			const res = await request(app)
				.post(joinEndpoint)
				.set('x-user-id', validUserId)
				.send({
					...validBody,
					guestName: '   ',
				});

			expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
			expect(res.body.success).toBe(false);
			expect(res.body.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 Bad Request when guestName exceeds max length', async () => {
			const res = await request(app)
				.post(joinEndpoint)
				.set('x-user-id', validUserId)
				.send({
					...validBody,
					guestName: 'A'.repeat(101),
				});

			expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
			expect(res.body.success).toBe(false);
			expect(res.body.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 Bad Request when specialNotes exceeds max length', async () => {
			const res = await request(app)
				.post(joinEndpoint)
				.set('x-user-id', validUserId)
				.send({
					...validBody,
					specialNotes: 'N'.repeat(501),
				});

			expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
			expect(res.body.success).toBe(false);
			expect(res.body.code).toBe('VALIDATION_ERROR');
		});

		it('should sanitize empty fid and empty specialNotes to null', () => {
			const parsed = joinQueueBodySchema.parse({
				guestName: 'Alex Mercer',
				guestPhone: '+15551234567',
				partySize: 2,
				specialNotes: '',
				fid: '',
			});

			expect(parsed.specialNotes).toBeNull();
			expect(parsed.fid).toBeNull();
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should return 409 Conflict when restaurant is closed or not accepting queues', async () => {
			jest
				.spyOn(RegisterQueueUseCase.prototype, 'execute')
				.mockRejectedValueOnce(new RestaurantNotAcceptingQueueError());

			const res = await request(app)
				.post(joinEndpoint)
				.set('x-user-id', validUserId)
				.send(validBody);

			expect(res.status).toBe(HTTP_STATUS.CONFLICT);
			expect(res.body.success).toBe(false);
			expect(res.body.code).toBe('RESTAURANT_NOT_ACCEPTING_QUEUE');
		});

		it('should return 409 Conflict when tables are available for immediate seating', async () => {
			jest
				.spyOn(RegisterQueueUseCase.prototype, 'execute')
				.mockRejectedValueOnce(new TableAvailableError(2));

			const res = await request(app)
				.post(joinEndpoint)
				.set('x-user-id', validUserId)
				.send(validBody);

			expect(res.status).toBe(HTTP_STATUS.CONFLICT);
			expect(res.body.success).toBe(false);
			expect(res.body.code).toBe('TABLES_AVAILABLE');
		});

		it('should return 409 Conflict when active queue entry already exists', async () => {
			jest
				.spyOn(RegisterQueueUseCase.prototype, 'execute')
				.mockRejectedValueOnce(new ActiveQueueEntryExistsError('+15551234567'));

			const res = await request(app)
				.post(joinEndpoint)
				.set('x-user-id', validUserId)
				.send(validBody);

			expect(res.status).toBe(HTTP_STATUS.CONFLICT);
			expect(res.body.success).toBe(false);
			expect(res.body.code).toBe('ACTIVE_QUEUE_ENTRY_EXISTS');
		});

		it('should return 409 Conflict when authenticated customer already holds an active ticket', async () => {
			jest
				.spyOn(RegisterQueueUseCase.prototype, 'execute')
				.mockRejectedValueOnce(new ActiveUserQueueEntryExistsError());

			const res = await request(app)
				.post(joinEndpoint)
				.set('x-user-id', validUserId)
				.send(validBody);

			expect(res.status).toBe(HTTP_STATUS.CONFLICT);
			expect(res.body.success).toBe(false);
			expect(res.body.code).toBe('ACTIVE_QUEUE_ENTRY_EXISTS');
		});

		it('should successfully join queue via /customer/... returning 201 and tracking websocket info', async () => {
			jest.spyOn(RegisterQueueUseCase.prototype, 'execute').mockResolvedValueOnce({
				queueEntryId: 'ticket-uuid-success',
				restaurantId: validRestaurantId,
				userId: validUserId,
				guestName: 'Alex Mercer',
				guestPhone: '+15551234567',
				queueNumber: 'Q-001',
				partySize: 2,
				specialNotes: 'Quiet booth if possible',
				registrationType: RegistrationType.ONLINE,
				position: 3,
				estimatedWaitMinutes: 15,
				status: 'WAITING',
				joinedAt: new Date().toISOString(),
			});

			const res = await request(app)
				.post(joinEndpoint)
				.set('x-user-id', validUserId)
				.send(validBody);

			expect(res.status).toBe(HTTP_STATUS.CREATED);
			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe(QUEUE_MESSAGES.JOIN_QUEUE_SUCCESS);
			expect(res.body.data).toEqual(
				expect.objectContaining({
					queueEntryId: 'ticket-uuid-success',
					restaurantId: validRestaurantId,
					userId: validUserId,
					queueNumber: 'Q-001',
					position: 3,
					estimatedWaitMinutes: 15,
					websocket: {
						path: WEBSOCKET_PATHS.GATEWAY_QUEUES,
						room: 'ticket:ticket-uuid-success',
						ticketId: 'ticket-uuid-success',
						subscribeEvent: 'join:ticket',
						updateEvent: 'queue:position-updated',
					},
				}),
			);
		});
	});
});
