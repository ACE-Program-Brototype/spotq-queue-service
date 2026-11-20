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
import { RedisQueueCacheService } from '../src/infrastructure/redis/redis-queue-cache.service.ts';
import { HTTP_STATUS, QUEUE_MESSAGES } from '../src/shared/index.ts';

describe('Staff Queue Actions API Integration Tests', () => {
	const restaurantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
	const queueEntryId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
	const tableId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
	const staffUserId = 'staff-101';
	let queueRepository: IQueueRepository;

	const createMockEntry = (status: QueueStatus = QueueStatus.WAITING) => {
		return QueueEntry.reconstitute({
			id: queueEntryId,
			restaurantId,
			userId: 'user-1',
			guestName: 'Jane Doe',
			phone: '+15551234567',
			queueNumber: 'W-005',
			partySize: 2,
			specialNotes: null,
			registrationType: RegistrationType.WALK_IN,
			position: 1,
			estimatedWaitMinutes: 10,
			estimatedWaitMinutesAtJoin: 10,
			status,
			ringCount: 0,
			lastRingedAt: null,
			fid: null,
			joinedAt: new Date(),
			seatedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	};

	beforeAll(() => {
		queueRepository = container.get<IQueueRepository>(TYPES.Repositories.QueueRepository);
	});

	beforeEach(() => {
		jest.spyOn(RestaurantServiceClient.prototype, 'assignTables').mockResolvedValue(undefined);
		jest.spyOn(RestaurantServiceClient.prototype, 'releaseTables').mockResolvedValue(undefined);
		jest.spyOn(RedisQueueCacheService.prototype, 'removeLiveEntry').mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('POST /staff/restaurants/:restaurantId/queue/:queueEntryId/seat', () => {
		it('should return 401 when x-user-id is missing', async () => {
			const res = await request(app)
				.post(`/staff/restaurants/${restaurantId}/queue/${queueEntryId}/seat`)
				.send({ tableIds: [tableId] });

			expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
		});

		it('should return 403 when x-restaurant-id does not match restaurantId', async () => {
			const res = await request(app)
				.post(`/staff/restaurants/${restaurantId}/queue/${queueEntryId}/seat`)
				.set('x-user-id', staffUserId)
				.set('x-user-role', 'STAFF')
				.set('x-restaurant-id', '99999999-9999-9999-9999-999999999999')
				.send({ tableIds: [tableId] });

			expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
		});

		it('should return 422 when tableIds is empty', async () => {
			const res = await request(app)
				.post(`/staff/restaurants/${restaurantId}/queue/${queueEntryId}/seat`)
				.set('x-user-id', staffUserId)
				.set('x-user-role', 'STAFF')
				.set('x-restaurant-id', restaurantId)
				.send({ tableIds: [] });

			expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
		});

		it('should seat party and return 200 on valid request', async () => {
			const entry = createMockEntry(QueueStatus.WAITING);
			jest.spyOn(queueRepository, 'findById').mockResolvedValue(entry);
			jest.spyOn(queueRepository, 'assignTablesWithHistory').mockResolvedValue(entry);
			jest.spyOn(queueRepository, 'findActiveEntries').mockResolvedValue([]);

			const res = await request(app)
				.post(`/staff/restaurants/${restaurantId}/queue/${queueEntryId}/seat`)
				.set('x-user-id', staffUserId)
				.set('x-user-role', 'STAFF')
				.set('x-restaurant-id', restaurantId)
				.send({ tableIds: [tableId] });

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe(QUEUE_MESSAGES.SEAT_PARTY_SUCCESS);
			expect(res.body.data.queueEntryId).toBe(queueEntryId);
			expect(res.body.data.status).toBe(QueueStatus.SEATED);
		});
	});

	describe('POST /staff/restaurants/:restaurantId/queue/:queueEntryId/skip', () => {
		it('should return 422 when reason is empty', async () => {
			const res = await request(app)
				.post(`/staff/restaurants/${restaurantId}/queue/${queueEntryId}/skip`)
				.set('x-user-id', staffUserId)
				.set('x-user-role', 'STAFF')
				.set('x-restaurant-id', restaurantId)
				.send({ reason: '' });

			expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
		});

		it('should skip party and return 200 on valid request', async () => {
			const entry = createMockEntry(QueueStatus.WAITING);
			jest.spyOn(queueRepository, 'findById').mockResolvedValue(entry);
			jest.spyOn(queueRepository, 'updateStatusWithHistory').mockResolvedValue(entry);
			jest.spyOn(queueRepository, 'findActiveEntries').mockResolvedValue([]);

			const res = await request(app)
				.post(`/staff/restaurants/${restaurantId}/queue/${queueEntryId}/skip`)
				.set('x-user-id', staffUserId)
				.set('x-user-role', 'STAFF')
				.set('x-restaurant-id', restaurantId)
				.send({ reason: 'Party not present' });

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe(QUEUE_MESSAGES.SKIP_PARTY_SUCCESS);
			expect(res.body.data.status).toBe(QueueStatus.SKIPPED);
		});
	});

	describe('POST /staff/restaurants/:restaurantId/queue/:queueEntryId/cancel', () => {
		it('should return 422 when reason is missing', async () => {
			const res = await request(app)
				.post(`/staff/restaurants/${restaurantId}/queue/${queueEntryId}/cancel`)
				.set('x-user-id', staffUserId)
				.set('x-user-role', 'STAFF')
				.set('x-restaurant-id', restaurantId)
				.send({});

			expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
		});

		it('should mark no-show and return 200 on reason NO_SHOW', async () => {
			const entry = createMockEntry(QueueStatus.WAITING);
			jest.spyOn(queueRepository, 'findById').mockResolvedValue(entry);
			jest.spyOn(queueRepository, 'findActiveTableAssignments').mockResolvedValue([]);
			jest.spyOn(queueRepository, 'updateStatusWithHistory').mockResolvedValue(entry);
			jest.spyOn(queueRepository, 'findActiveEntries').mockResolvedValue([]);

			const res = await request(app)
				.post(`/staff/restaurants/${restaurantId}/queue/${queueEntryId}/cancel`)
				.set('x-user-id', staffUserId)
				.set('x-user-role', 'STAFF')
				.set('x-restaurant-id', restaurantId)
				.send({ reason: 'NO_SHOW', notes: 'Did not answer phone' });

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe(QUEUE_MESSAGES.NO_SHOW_QUEUE_ENTRY_SUCCESS);
			expect(res.body.data.status).toBe(QueueStatus.NO_SHOW);
		});

		it('should cancel entry and return 200 on reason GUEST_CANCELLED', async () => {
			const entry = createMockEntry(QueueStatus.WAITING);
			jest.spyOn(queueRepository, 'findById').mockResolvedValue(entry);
			jest.spyOn(queueRepository, 'findActiveTableAssignments').mockResolvedValue([]);
			jest.spyOn(queueRepository, 'updateStatusWithHistory').mockResolvedValue(entry);
			jest.spyOn(queueRepository, 'findActiveEntries').mockResolvedValue([]);

			const res = await request(app)
				.post(`/staff/restaurants/${restaurantId}/queue/${queueEntryId}/cancel`)
				.set('x-user-id', staffUserId)
				.set('x-user-role', 'STAFF')
				.set('x-restaurant-id', restaurantId)
				.send({ reason: 'GUEST_CANCELLED' });

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe(QUEUE_MESSAGES.CANCEL_QUEUE_ENTRY_SUCCESS);
			expect(res.body.data.status).toBe(QueueStatus.CANCELLED);
		});
	});
});
