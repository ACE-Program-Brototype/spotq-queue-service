process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/spotq_test';
process.env.REDIS_URL = 'redis://localhost:6379';

import type { IQueueCacheService } from '../src/application/ports/cache/queue-cache.port.ts';
import type { IEtaService } from '../src/application/ports/services/eta-service.port.ts';
import type { IRestaurantServiceClient } from '../src/application/ports/services/restaurant-service.port.ts';
import type { IWebSocketBroadcaster } from '../src/application/ports/services/websocket-broadcaster.port.ts';
import { RegisterWalkInUseCase } from '../src/application/use-cases/register-walk-in.use-case.ts';
import {
	ActiveQueueEntryExistsError,
	QueueEntry,
	RestaurantBlockedError,
	RestaurantNotAcceptingQueueError,
	SubscriptionRequiredError,
	TableAvailableError,
} from '../src/domain/index.ts';
import type { IQueueRepository } from '../src/domain/repositories/queue.repository.interface.ts';

describe('RegisterWalkInUseCase Unit Tests', () => {
	let mockQueueRepository: jest.Mocked<IQueueRepository>;
	let mockRestaurantServiceClient: jest.Mocked<IRestaurantServiceClient>;
	let mockEtaService: jest.Mocked<IEtaService>;
	let mockQueueCacheService: jest.Mocked<IQueueCacheService>;
	let mockWebSocketBroadcaster: jest.Mocked<IWebSocketBroadcaster>;
	let useCase: RegisterWalkInUseCase;

	const defaultInput = {
		restaurantId: 'rest-1234',
		staffUserId: 'staff-999',
		guestName: 'David Miller',
		guestPhone: '+15559876543',
		partySize: 4,
		specialNotes: 'Prefers booth seating',
	};

	beforeEach(() => {
		mockQueueRepository = {
			findById: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
			save: jest.fn(),
			findPaginated: jest.fn(),
			findActiveEntries: jest.fn(),
			countActiveAhead: jest.fn().mockResolvedValue(5),
			sumPartySizeActiveAhead: jest.fn().mockResolvedValue(16),
			countToday: jest.fn().mockResolvedValue(12),
			findActiveByPhone: jest.fn().mockResolvedValue(null),
			createWithHistory: jest
				.fn()
				.mockImplementation((entry: QueueEntry) => Promise.resolve(entry)),
		};

		mockRestaurantServiceClient = {
			checkAvailability: jest.fn().mockResolvedValue({
				restaurantId: 'rest-1234',
				isOpen: true,
				acceptsQueue: true,
				isTableAvailable: false,
				availableCount: 0,
			}),
			getRestaurantStatus: jest.fn().mockResolvedValue({
				restaurantId: 'rest-1234',
				restaurantName: 'Grand Bistro',
				verificationStatus: 'ACTIVE',
				isBlocked: false,
				blockReason: null,
				isSubscriptionActive: true,
				subscriptionPlanCode: 'QUEUE_PRO',
				subscriptionEndsAt: '2026-12-31T23:59:59.999Z',
				canAccessQueueService: true,
			}),
		};

		mockEtaService = {
			predictEta: jest.fn().mockResolvedValue(25),
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

		useCase = new RegisterWalkInUseCase(
			mockQueueRepository,
			mockRestaurantServiceClient,
			mockEtaService,
			mockQueueCacheService,
			mockWebSocketBroadcaster,
		);
	});

	it('should throw RestaurantBlockedError (403) if restaurant is blocked by admin', async () => {
		mockRestaurantServiceClient.getRestaurantStatus.mockResolvedValueOnce({
			restaurantId: 'rest-1234',
			restaurantName: 'Grand Bistro',
			verificationStatus: 'SUSPENDED',
			isBlocked: true,
			blockReason: 'Administrative policy violation',
			isSubscriptionActive: true,
			subscriptionPlanCode: 'QUEUE_PRO',
			subscriptionEndsAt: '2026-12-31T23:59:59.999Z',
			canAccessQueueService: false,
		});

		await expect(useCase.execute(defaultInput)).rejects.toThrow(RestaurantBlockedError);
		expect(mockRestaurantServiceClient.checkAvailability).not.toHaveBeenCalled();
		expect(mockQueueRepository.createWithHistory).not.toHaveBeenCalled();
	});

	it('should throw SubscriptionRequiredError (403) if restaurant subscription is inactive', async () => {
		mockRestaurantServiceClient.getRestaurantStatus.mockResolvedValueOnce({
			restaurantId: 'rest-1234',
			restaurantName: 'Grand Bistro',
			verificationStatus: 'ACTIVE',
			isBlocked: false,
			blockReason: null,
			isSubscriptionActive: false,
			subscriptionPlanCode: 'QUEUE_PRO',
			subscriptionEndsAt: null,
			canAccessQueueService: false,
		});

		await expect(useCase.execute(defaultInput)).rejects.toThrow(SubscriptionRequiredError);
		expect(mockRestaurantServiceClient.checkAvailability).not.toHaveBeenCalled();
		expect(mockQueueRepository.createWithHistory).not.toHaveBeenCalled();
	});

	it('should throw SubscriptionRequiredError (403) if restaurant subscription is not QUEUE_PRO', async () => {
		mockRestaurantServiceClient.getRestaurantStatus.mockResolvedValueOnce({
			restaurantId: 'rest-1234',
			restaurantName: 'Grand Bistro',
			verificationStatus: 'ACTIVE',
			isBlocked: false,
			blockReason: null,
			isSubscriptionActive: true,
			subscriptionPlanCode: 'SELF_SERVICE_PRO',
			subscriptionEndsAt: '2026-12-31T23:59:59.999Z',
			canAccessQueueService: false,
		});

		await expect(useCase.execute(defaultInput)).rejects.toThrow(SubscriptionRequiredError);
		expect(mockRestaurantServiceClient.checkAvailability).not.toHaveBeenCalled();
		expect(mockQueueRepository.createWithHistory).not.toHaveBeenCalled();
	});

	it('should throw TableAvailableError (409) if a suitable table is available (no queue needed)', async () => {
		mockRestaurantServiceClient.checkAvailability.mockResolvedValueOnce({
			restaurantId: 'rest-1234',
			isOpen: true,
			acceptsQueue: true,
			isTableAvailable: true,
			availableCount: 2,
		});

		await expect(useCase.execute(defaultInput)).rejects.toThrow(TableAvailableError);
		expect(mockQueueRepository.createWithHistory).not.toHaveBeenCalled();
		expect(mockWebSocketBroadcaster.broadcastToRestaurant).not.toHaveBeenCalled();
	});

	it('should throw RestaurantNotAcceptingQueueError if restaurant is closed or queueing disabled', async () => {
		mockRestaurantServiceClient.checkAvailability.mockResolvedValueOnce({
			restaurantId: 'rest-1234',
			isOpen: false,
			acceptsQueue: false,
			isTableAvailable: false,
			availableCount: 0,
		});

		await expect(useCase.execute(defaultInput)).rejects.toThrow(RestaurantNotAcceptingQueueError);
		expect(mockQueueRepository.createWithHistory).not.toHaveBeenCalled();
	});

	it('should throw ActiveQueueEntryExistsError if guest with phone is already queued', async () => {
		mockQueueRepository.findActiveByPhone.mockResolvedValueOnce(
			QueueEntry.createWalkIn({
				restaurantId: 'rest-1234',
				guestName: 'David Miller',
				phone: '+15559876543',
				queueNumber: 'W-005',
				partySize: 4,
				position: 2,
				estimatedWaitMinutes: 10,
			}),
		);

		await expect(useCase.execute(defaultInput)).rejects.toThrow(ActiveQueueEntryExistsError);
		expect(mockQueueRepository.createWithHistory).not.toHaveBeenCalled();
	});

	it('should calculate position, call ETA, persist entry, store in Redis, and broadcast WebSocket event', async () => {
		const result = await useCase.execute(defaultInput);

		// 1. Verify table availability call
		expect(mockRestaurantServiceClient.checkAvailability).toHaveBeenCalledWith('rest-1234', 4);

		// 2. Position should be activeAhead + 1 = 5 + 1 = 6
		expect(result.position).toBe(6);

		// 3. ETA Service should receive totalPeopleAhead (16) and partySize (4)
		expect(mockEtaService.predictEta).toHaveBeenCalledWith('rest-1234', 16, 4);
		expect(result.estimatedWaitMinutes).toBe(25);

		// 4. Persistence verification
		expect(mockQueueRepository.createWithHistory).toHaveBeenCalledTimes(1);
		const createdEntry = mockQueueRepository.createWithHistory.mock.calls[0][0];
		expect(createdEntry.registrationType).toBe('WALK_IN');
		expect(createdEntry.queueNumber).toBe('W-013'); // 12 + 1
		expect(createdEntry.phone).toBe('+15559876543');

		// 5. Redis live cache verification
		expect(mockQueueCacheService.saveLiveEntry).toHaveBeenCalledWith(
			createdEntry.id,
			'rest-1234',
			6,
			25,
		);

		// 6. WebSocket broadcast verification
		expect(mockWebSocketBroadcaster.broadcastToRestaurant).toHaveBeenCalledWith(
			'rest-1234',
			'QUEUE_ENTRY_CREATED',
			expect.objectContaining({
				event: 'QUEUE_ENTRY_CREATED',
				restaurantId: 'rest-1234',
				queueEntry: expect.objectContaining({
					id: createdEntry.id,
					guestName: 'David Miller',
					guestPhone: '+15559876543',
					partySize: 4,
					registrationType: 'WALK_IN',
					position: 6,
					estimatedWaitMinutes: 25,
					status: 'WAITING',
				}),
			}),
		);

		// 7. Output DTO conforms to specification
		expect(result).toEqual({
			queueEntryId: createdEntry.id,
			restaurantId: 'rest-1234',
			guestName: 'David Miller',
			guestPhone: '+15559876543',
			partySize: 4,
			registrationType: 'WALK_IN',
			position: 6,
			estimatedWaitMinutes: 25,
			status: 'WAITING',
			joinedAt: expect.any(String),
		});
	});
});

import request from 'supertest';
import app from '../src/app.ts';

describe('POST /staff/restaurants/:restaurantId/queue/walk-in HTTP Tests', () => {
	const endpoint = '/staff/restaurants/rest-1234/queue/walk-in';

	it('should return 401 Unauthorized if auth credentials are missing', async () => {
		const res = await request(app).post(endpoint).send({
			guestName: 'David Miller',
			guestPhone: '+15559876543',
			partySize: 2,
		});

		expect(res.status).toBe(401);
		expect(res.body.success).toBe(false);
		expect(res.body.error).toBe('UNAUTHORIZED');
	});

	it('should return 403 Forbidden if user role is not STAFF or ADMIN', async () => {
		const res = await request(app)
			.post(endpoint)
			.set('x-user-id', 'user-1')
			.set('x-user-role', 'CUSTOMER')
			.send({
				guestName: 'David Miller',
				guestPhone: '+15559876543',
				partySize: 2,
			});

		expect(res.status).toBe(403);
		expect(res.body.success).toBe(false);
		expect(res.body.error).toBe('FORBIDDEN');
	});

	it('should return 403 Forbidden if staff attempts to manage another restaurant', async () => {
		const res = await request(app)
			.post(endpoint)
			.set('x-user-id', 'staff-1')
			.set('x-user-role', 'STAFF')
			.set('x-restaurant-id', 'different-restaurant-id')
			.send({
				guestName: 'David Miller',
				guestPhone: '+15559876543',
				partySize: 2,
			});

		expect(res.status).toBe(403);
		expect(res.body.success).toBe(false);
	});

	it('should return 400 Bad Request if partySize is out of range', async () => {
		const res = await request(app)
			.post(endpoint)
			.set('x-user-id', 'staff-1')
			.set('x-user-role', 'STAFF')
			.set('x-restaurant-id', 'rest-1234')
			.send({
				guestName: 'David Miller',
				guestPhone: '+15559876543',
				partySize: 25, // Max is 20
			});

		expect(res.status).toBe(400);
		expect(res.body.success).toBe(false);
		expect(res.body.error).toBe('VALIDATION_ERROR');
	});

	it('should return 400 Bad Request if guestPhone is not valid E.164 format', async () => {
		const res = await request(app)
			.post(endpoint)
			.set('x-user-id', 'staff-1')
			.set('x-user-role', 'STAFF')
			.set('x-restaurant-id', 'rest-1234')
			.send({
				guestName: 'David Miller',
				guestPhone: 'invalid-phone-format',
				partySize: 2,
			});

		expect(res.status).toBe(400);
		expect(res.body.success).toBe(false);
		expect(res.body.error).toBe('VALIDATION_ERROR');
	});
});

import { container, TYPES } from '../src/di/index.ts';
import { PrismaQueueRepository } from '../src/infrastructure/database/repositories/prisma-queue.repository.ts';
import { MlEtaServiceClient } from '../src/infrastructure/external/ml-eta-service.client.ts';
import { RestaurantServiceClient } from '../src/infrastructure/external/restaurant-service.client.ts';
import { RedisQueueCacheService } from '../src/infrastructure/redis/redis-queue-cache.service.ts';
import { SocketBroadcaster } from '../src/infrastructure/websocket/socket-broadcaster.ts';
import { WalkInController } from '../src/presentation/http/controllers/walk-in.controller.ts';

describe('Inversify DI Container Resolution Tests', () => {
	it('should successfully resolve WalkInController from container', () => {
		const controller = container.get<WalkInController>(TYPES.Controller.WalkInController);
		expect(controller).toBeDefined();
		expect(controller).toBeInstanceOf(WalkInController);
		expect(typeof controller.registerWalkIn).toBe('function');
	});

	it('should successfully resolve RegisterWalkInUseCase from container', () => {
		const useCase = container.get<RegisterWalkInUseCase>(TYPES.UseCases.RegisterWalkInUseCase);
		expect(useCase).toBeDefined();
		expect(useCase).toBeInstanceOf(RegisterWalkInUseCase);
		expect(typeof useCase.execute).toBe('function');
	});

	it('should successfully resolve PrismaQueueRepository from container', () => {
		const repo = container.get<IQueueRepository>(TYPES.Repositories.QueueRepository);
		expect(repo).toBeDefined();
		expect(repo).toBeInstanceOf(PrismaQueueRepository);
	});

	it('should successfully resolve RestaurantServiceClient from container', () => {
		const service = container.get<IRestaurantServiceClient>(TYPES.Services.RestaurantServiceClient);
		expect(service).toBeDefined();
		expect(service).toBeInstanceOf(RestaurantServiceClient);
	});

	it('should successfully resolve MlEtaServiceClient from container', () => {
		const service = container.get<IEtaService>(TYPES.Services.EtaService);
		expect(service).toBeDefined();
		expect(service).toBeInstanceOf(MlEtaServiceClient);
	});

	it('should successfully resolve RedisQueueCacheService from container', () => {
		const service = container.get<IQueueCacheService>(TYPES.Services.QueueCacheService);
		expect(service).toBeDefined();
		expect(service).toBeInstanceOf(RedisQueueCacheService);
	});

	it('should successfully resolve SocketBroadcaster from container', () => {
		const broadcaster = container.get<IWebSocketBroadcaster>(TYPES.Services.WebSocketBroadcaster);
		expect(broadcaster).toBeDefined();
		expect(broadcaster).toBeInstanceOf(SocketBroadcaster);
	});
});
