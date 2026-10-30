import 'reflect-metadata';

jest.mock('../src/presentation/http/middleware/internal-s2s-auth.middleware.ts', () => ({
	internalS2SAuthMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import request from 'supertest';
import app from '../src/app.ts';
import { container } from '../src/di/container.ts';
import { TYPES } from '../src/di/types.ts';
import { QueueEntry, QueueStatus, RegistrationType } from '../src/domain/index.ts';
import type { IQueueRepository } from '../src/domain/repositories/queue.repository.interface.ts';
import { HTTP_STATUS, messages, QUEUE_MESSAGES } from '../src/shared/index.ts';

describe('Internal Queue API - GET /api/internal/v1/restaurants/:restaurantId/queue/users/:userId/active', () => {
	const restaurantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
	const userId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
	let queueRepository: IQueueRepository;

	beforeAll(() => {
		queueRepository = container.get<IQueueRepository>(TYPES.Repositories.QueueRepository);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should return 200 with queue data when active queue is found', async () => {
		const mockEntry = QueueEntry.create({
			id: '33333333-3333-3333-3333-333333333333',
			restaurantId,
			userId,
			guestName: 'John Doe',
			phone: '+1234567890',
			queueNumber: 'W-002',
			partySize: 3,
			position: 2,
			estimatedWaitMinutes: 20,
			registrationType: RegistrationType.ONLINE,
		});

		const findSpy = jest
			.spyOn(queueRepository, 'findActiveByUserIdAndRestaurantId')
			.mockResolvedValue(mockEntry);

		const res = await request(app)
			.get(`/api/internal/v1/restaurants/${restaurantId}/queue/users/${userId}/active`)
			.set('Accept', 'application/json');

		expect(res.status).toBe(HTTP_STATUS.OK);
		expect(res.body.success).toBe(true);
		expect(res.body.message).toBe(QUEUE_MESSAGES.ACTIVE_QUEUE_CHECK_SUCCESS);
		expect(res.body.data.hasActiveQueue).toBe(true);
		expect(res.body.data.queueEntry).toMatchObject({
			queueEntryId: '33333333-3333-3333-3333-333333333333',
			restaurantId,
			userId,
			queueNumber: 'W-002',
			partySize: 3,
			status: QueueStatus.WAITING,
			position: 2,
			estimatedWaitMinutes: 20,
		});
		expect(findSpy).toHaveBeenCalledWith(restaurantId, userId);
	});

	it('should return 200 with hasActiveQueue: false when no queue entry exists', async () => {
		const findSpy = jest
			.spyOn(queueRepository, 'findActiveByUserIdAndRestaurantId')
			.mockResolvedValue(null);

		const res = await request(app)
			.get(`/api/internal/v1/restaurants/${restaurantId}/queue/users/${userId}/active`)
			.set('Accept', 'application/json');

		expect(res.status).toBe(HTTP_STATUS.OK);
		expect(res.body.success).toBe(true);
		expect(res.body.message).toBe(QUEUE_MESSAGES.ACTIVE_QUEUE_CHECK_SUCCESS);
		expect(res.body.data.hasActiveQueue).toBe(false);
		expect(res.body.data.queueEntry).toBeNull();
		expect(findSpy).toHaveBeenCalledWith(restaurantId, userId);
	});

	it('should return 400 when restaurantId or userId is not a valid UUID', async () => {
		const findSpy = jest.spyOn(queueRepository, 'findActiveByUserIdAndRestaurantId');

		const res = await request(app)
			.get('/api/internal/v1/restaurants/invalid-uuid/queue/users/invalid-uuid/active')
			.set('Accept', 'application/json');

		expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
		expect(res.body.success).toBe(false);
		expect(findSpy).not.toHaveBeenCalled();
	});
});

describe('Internal Queue API - GET /api/internal/v1/queue-entries/:userId/status', () => {
	const userId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
	let queueRepository: IQueueRepository;

	beforeAll(() => {
		queueRepository = container.get<IQueueRepository>(TYPES.Repositories.QueueRepository);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should return 200 with customer queue status when a waiting entry is found', async () => {
		const mockEntry = QueueEntry.create({
			id: '33333333-3333-3333-3333-333333333333',
			restaurantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			userId,
			guestName: 'John Doe',
			phone: '+1234567890',
			queueNumber: 'W-002',
			partySize: 3,
			position: 2,
			estimatedWaitMinutes: 20,
			registrationType: RegistrationType.ONLINE,
		});

		const findSpy = jest.spyOn(queueRepository, 'findActiveByUserId').mockResolvedValue(mockEntry);

		const res = await request(app)
			.get(`/api/internal/v1/queue-entries/${userId}/status`)
			.set('Accept', 'application/json');

		expect(res.status).toBe(HTTP_STATUS.OK);
		expect(res.body.success).toBe(true);
		expect(res.body.message).toBe(messages.CUSTOMER_QUEUE_STATUS_FETCH);
		expect(res.body.data).toEqual({
			restaurantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			queueEntryId: '33333333-3333-3333-3333-333333333333',
		});
		expect(findSpy).toHaveBeenCalledWith(userId);
	});

	it('should return 200 with null when no active queue entry exists', async () => {
		const findSpy = jest.spyOn(queueRepository, 'findActiveByUserId').mockResolvedValue(null);

		const res = await request(app)
			.get(`/api/internal/v1/queue-entries/${userId}/status`)
			.set('Accept', 'application/json');

		expect(res.status).toBe(HTTP_STATUS.OK);
		expect(res.body.success).toBe(true);
		expect(res.body.message).toBe(messages.CUSTOMER_QUEUE_STATUS_FETCH);
		expect(res.body.data).toBeNull();
		expect(findSpy).toHaveBeenCalledWith(userId);
	});

	it('should return 400 when userId is not a valid UUID', async () => {
		const findSpy = jest.spyOn(queueRepository, 'findActiveByUserId');

		const res = await request(app)
			.get('/api/internal/v1/queue-entries/invalid-uuid/status')
			.set('Accept', 'application/json');

		expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
		expect(res.body.success).toBe(false);
		expect(findSpy).not.toHaveBeenCalled();
	});
});
