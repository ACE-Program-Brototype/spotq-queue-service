jest.mock('ioredis', () => {
	return jest.fn().mockImplementation(() => {
		return {
			on: jest.fn(),
			ping: jest.fn().mockResolvedValue('PONG'),
			quit: jest.fn().mockResolvedValue(undefined),
			close: jest.fn().mockResolvedValue(undefined),
			del: jest.fn().mockResolvedValue(1),
			set: jest.fn().mockResolvedValue('OK'),
			get: jest.fn().mockResolvedValue(null),
		};
	});
});

import 'reflect-metadata';
import request from 'supertest';
import app from '../src/app.ts';
import { container } from '../src/di/container.ts';
import { TYPES } from '../src/di/types.ts';
import { QueueEntry, QueueStatus, RegistrationType } from '../src/domain/index.ts';
import type { IQueueRepository } from '../src/domain/repositories/i-queue.repository.ts';
import { RestaurantServiceClient } from '../src/infrastructure/external/restaurant-service.client.ts';
import type { CustomerQueueController } from '../src/presentation/http/controllers/customer-queue.controller.ts';
import { HTTP_STATUS, QUEUE_MESSAGES, VALIDATION_MESSAGES } from '../src/shared/index.ts';

describe('Customer Queue Status Snapshot API Integration Tests', () => {
	const validRestaurantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
	const validQueueEntryId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
	const validUserId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

	const customerEndpoint = `/customer/restaurants/${validRestaurantId}/queue/status`;
	const directEndpoint = `/restaurants/${validRestaurantId}/queue/status`;

	let queueRepository: IQueueRepository;

	const createMockEntry = (
		status: QueueStatus = QueueStatus.WAITING,
		ownerId: string = validUserId,
	) => {
		return QueueEntry.reconstitute({
			id: validQueueEntryId,
			restaurantId: validRestaurantId,
			userId: ownerId,
			guestName: 'Alex Mercer',
			phone: '+15551234567',
			queueNumber: 'Q-042',
			partySize: 2,
			specialNotes: 'Window table preferred',
			registrationType: RegistrationType.ONLINE,
			position: 4,
			estimatedWaitMinutes: 20,
			estimatedWaitMinutesAtJoin: 20,
			status,
			ringCount: 0,
			lastRingedAt: null,
			fid: null,
			joinedAt: new Date('2026-11-08T10:00:00.000Z'),
			seatedAt: null,
			createdAt: new Date('2026-11-08T10:00:00.000Z'),
			updatedAt: new Date('2026-11-08T10:00:00.000Z'),
		});
	};

	beforeAll(() => {
		queueRepository = container.get<IQueueRepository>(TYPES.Repositories.QueueRepository);
	});

	beforeEach(() => {
		jest.spyOn(RestaurantServiceClient.prototype, 'getRestaurantStatus').mockResolvedValue({
			restaurantId: validRestaurantId,
			restaurantName: 'The Rustic Fork',
			verificationStatus: 'VERIFIED',
			isBlocked: false,
			blockReason: null,
			isSubscriptionActive: true,
			subscriptionPlanCode: 'QUEUE_PRO',
			subscriptionEndsAt: null,
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('DI Container Resolution', () => {
		it('should resolve CustomerQueueController with getQueueStatus and getActiveQueue methods', () => {
			const controller = container.get<CustomerQueueController>(
				TYPES.Controllers.CustomerQueueController,
			);
			expect(controller).toBeDefined();
			expect(typeof controller.getQueueStatus).toBe('function');
			expect(typeof controller.getActiveQueue).toBe('function');
		});
	});

	describe('GET /customer/active', () => {
		const activeEndpoint = '/customer/active';

		it('should return 401 when x-user-id header is missing', async () => {
			const res = await request(app).get(activeEndpoint);

			expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
			expect(res.body.success).toBe(false);
		});

		it('should return 200 with null when customer has no active waiting queue entry', async () => {
			const findSpy = jest.spyOn(queueRepository, 'findActiveByUserId').mockResolvedValueOnce(null);

			const res = await request(app).get(activeEndpoint).set('x-user-id', validUserId);

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe(QUEUE_MESSAGES.ACTIVE_QUEUE_CHECK_SUCCESS);
			expect(res.body.data).toBeNull();
			expect(findSpy).toHaveBeenCalledWith(validUserId);
		});

		it('should return 200 with null when customer latest entry is not waiting', async () => {
			const seatedEntry = createMockEntry(QueueStatus.SEATED, validUserId);
			jest.spyOn(queueRepository, 'findActiveByUserId').mockResolvedValueOnce(seatedEntry);

			const res = await request(app).get(activeEndpoint).set('x-user-id', validUserId);

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(res.body.success).toBe(true);
			expect(res.body.data).toBeNull();
		});

		it('should return 200 with lightweight active ticket metadata when customer is waiting', async () => {
			const waitingEntry = createMockEntry(QueueStatus.WAITING, validUserId);
			const findSpy = jest
				.spyOn(queueRepository, 'findActiveByUserId')
				.mockResolvedValueOnce(waitingEntry);

			const res = await request(app).get(activeEndpoint).set('x-user-id', validUserId);

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe(QUEUE_MESSAGES.ACTIVE_QUEUE_CHECK_SUCCESS);
			expect(res.body.data).toEqual({
				queueEntryId: validQueueEntryId,
				restaurantId: validRestaurantId,
				queueNumber: 'Q-042',
				status: QueueStatus.WAITING,
			});
			expect(findSpy).toHaveBeenCalledWith(validUserId);
			expect(RestaurantServiceClient.prototype.getRestaurantStatus).not.toHaveBeenCalled();
		});
	});

	describe('GET /customer/restaurants/:restaurantId/queue/status', () => {
		it('should return 401 when x-user-id header is missing', async () => {
			const res = await request(app)
				.get(customerEndpoint)
				.query({ queueEntryId: validQueueEntryId });

			expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
			expect(res.body.success).toBe(false);
		});

		it('should return 400 when restaurantId is not a valid UUID', async () => {
			const res = await request(app)
				.get('/customer/restaurants/not-a-valid-uuid/queue/status')
				.set('x-user-id', validUserId)
				.query({ queueEntryId: validQueueEntryId });

			expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
			expect(res.body.success).toBe(false);
			expect(res.body.details).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						field: 'restaurantId',
						message: VALIDATION_MESSAGES.INVALID_RESTAURANT_ID_UUID,
					}),
				]),
			);
		});

		it('should return 400 when queueEntryId is missing from query', async () => {
			const res = await request(app).get(customerEndpoint).set('x-user-id', validUserId);

			expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
			expect(res.body.success).toBe(false);
		});

		it('should return 400 when queueEntryId is not a valid UUID', async () => {
			const res = await request(app)
				.get(customerEndpoint)
				.set('x-user-id', validUserId)
				.query({ queueEntryId: 'invalid-id' });

			expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
			expect(res.body.success).toBe(false);
			expect(res.body.details).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						field: 'queueEntryId',
						message: VALIDATION_MESSAGES.INVALID_QUEUE_ENTRY_ID_UUID,
					}),
				]),
			);
		});

		it('should return 400 when unknown query parameter is provided due to strict schema', async () => {
			const res = await request(app).get(customerEndpoint).set('x-user-id', validUserId).query({
				queueEntryId: validQueueEntryId,
				unexpectedParam: 'forbidden',
			});

			expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
			expect(res.body.success).toBe(false);
		});

		it('should return 404 when queue entry does not exist', async () => {
			jest.spyOn(queueRepository, 'getCustomerQueueEntrySnapshot').mockResolvedValueOnce(null);

			const res = await request(app)
				.get(customerEndpoint)
				.set('x-user-id', validUserId)
				.query({ queueEntryId: validQueueEntryId });

			expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
			expect(res.body.success).toBe(false);
			expect(res.body.code).toBe('QUEUE_ENTRY_NOT_FOUND');
		});

		it('should return 403 Forbidden when ticket has WALK_IN registration type', async () => {
			const entry = QueueEntry.reconstitute({
				id: validQueueEntryId,
				restaurantId: validRestaurantId,
				userId: null,
				guestName: 'Walk-in Guest',
				phone: '+15559876543',
				queueNumber: 'W-002',
				partySize: 2,
				specialNotes: null,
				registrationType: RegistrationType.WALK_IN,
				position: 1,
				estimatedWaitMinutes: 5,
				estimatedWaitMinutesAtJoin: 5,
				status: QueueStatus.WAITING,
				ringCount: 0,
				lastRingedAt: null,
				fid: null,
				joinedAt: new Date('2026-11-08T10:00:00.000Z'),
				seatedAt: null,
				createdAt: new Date('2026-11-08T10:00:00.000Z'),
				updatedAt: new Date('2026-11-08T10:00:00.000Z'),
			});
			jest.spyOn(queueRepository, 'getCustomerQueueEntrySnapshot').mockResolvedValueOnce({
				entry,
				position: 1,
				totalWaitingParties: 2,
				assignedTableId: null,
			});

			const res = await request(app)
				.get(customerEndpoint)
				.set('x-user-id', validUserId)
				.query({ queueEntryId: validQueueEntryId });

			expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
			expect(res.body.success).toBe(false);
			expect(res.body.code).toBe('WALK_IN_TICKET_NOT_ACCESSIBLE');
		});

		it('should return 403 Forbidden when ticket does not belong to requesting customer', async () => {
			const entry = createMockEntry(QueueStatus.WAITING, 'different-user-uuid');
			jest.spyOn(queueRepository, 'getCustomerQueueEntrySnapshot').mockResolvedValueOnce({
				entry,
				position: 1,
				totalWaitingParties: 2,
				assignedTableId: null,
			});

			const res = await request(app)
				.get(customerEndpoint)
				.set('x-user-id', validUserId)
				.query({ queueEntryId: validQueueEntryId });

			expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
			expect(res.body.success).toBe(false);
			expect(res.body.code).toBe('FORBIDDEN');
		});

		it('should return 200 with queue status snapshot on valid request', async () => {
			const entry = createMockEntry(QueueStatus.WAITING, validUserId);
			jest.spyOn(queueRepository, 'getCustomerQueueEntrySnapshot').mockResolvedValueOnce({
				entry,
				position: 4,
				totalWaitingParties: 6,
				assignedTableId: null,
			});

			const res = await request(app)
				.get(customerEndpoint)
				.set('x-user-id', validUserId)
				.query({ queueEntryId: validQueueEntryId });

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe(QUEUE_MESSAGES.CUSTOMER_QUEUE_STATUS_FETCH);
			expect(res.body.data).toEqual({
				queueEntryId: validQueueEntryId,
				restaurantId: validRestaurantId,
				restaurantName: 'The Rustic Fork',
				queueNumber: 'Q-042',
				guestName: 'Alex Mercer',
				partySize: 2,
				position: 4,
				totalWaitingParties: 6,
				estimatedWaitMinutes: 20,
				status: QueueStatus.WAITING,
				registrationType: RegistrationType.ONLINE,
				joinedAt: '2026-11-08T10:00:00.000Z',
				updatedAt: '2026-11-08T10:00:00.000Z',
				lastRingAt: null,
				responseDeadline: null,
				assignedTableId: null,
			});
		});

		it('should return 404 on direct /restaurants/:restaurantId/queue/status path without customer prefix', async () => {
			const res = await request(app)
				.get(directEndpoint)
				.set('x-user-id', validUserId)
				.query({ queueEntryId: validQueueEntryId });

			expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
		});
	});
});
