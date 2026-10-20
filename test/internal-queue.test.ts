import 'reflect-metadata';
import request from 'supertest';
import app from '../src/app.ts';
import { internalQueueController } from '../src/di/controllers.resolutions.ts';
import { QueueStatus } from '../src/domain/enums/queue.enums.ts';
import { HTTP_STATUS, QUEUE_MESSAGES, sendSuccessResponse } from '../src/shared/index.ts';

describe('Internal Queue API - GET /api/internal/v1/restaurants/:restaurantId/queue/users/:userId/active', () => {
	const restaurantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
	const userId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should return 200 with queue data when active queue is found', async () => {
		jest
			.spyOn(internalQueueController, 'getActiveQueueByUser')
			.mockImplementation(async (req, res) => {
				sendSuccessResponse(
					res,
					{
						hasActiveQueue: true,
						queueEntry: {
							id: '33333333-3333-3333-3333-333333333333',
							restaurantId,
							userId,
							queueNumber: 'W-002',
							partySize: 3,
							status: QueueStatus.WAITING,
							position: 2,
							estimatedWaitMinutes: 20,
							joinedAt: new Date(),
						},
					},
					QUEUE_MESSAGES.ACTIVE_QUEUE_CHECK_SUCCESS,
					HTTP_STATUS.OK,
				);
			});

		const res = await request(app)
			.get(`/api/internal/v1/restaurants/${restaurantId}/queue/users/${userId}/active`)
			.set('Accept', 'application/json');

		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);
		expect(res.body.data.hasActiveQueue).toBe(true);
		expect(res.body.data.queueEntry.queueNumber).toBe('W-002');
	});

	it('should return 200 with hasActiveQueue: false when no queue entry exists', async () => {
		jest
			.spyOn(internalQueueController, 'getActiveQueueByUser')
			.mockImplementation(async (req, res) => {
				sendSuccessResponse(
					res,
					{
						hasActiveQueue: false,
						queueEntry: null,
					},
					QUEUE_MESSAGES.ACTIVE_QUEUE_CHECK_SUCCESS,
					HTTP_STATUS.OK,
				);
			});

		const res = await request(app)
			.get(`/api/internal/v1/restaurants/${restaurantId}/queue/users/${userId}/active`)
			.set('Accept', 'application/json');

		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);
		expect(res.body.data.hasActiveQueue).toBe(false);
		expect(res.body.data.queueEntry).toBeNull();
	});

	it('should return 400 when restaurantId or userId is not a valid UUID', async () => {
		const res = await request(app)
			.get('/api/internal/v1/restaurants/invalid-uuid/queue/users/invalid-uuid/active')
			.set('Accept', 'application/json');

		expect(res.status).toBe(400);
		expect(res.body.success).toBe(false);
	});
});
