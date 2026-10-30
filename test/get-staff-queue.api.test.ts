import 'reflect-metadata';
import request from 'supertest';
import app from '../src/app.ts';
import { container } from '../src/di/container.ts';
import { TYPES } from '../src/di/types.ts';
import { QueueEntry, QueueStatus, RegistrationType } from '../src/domain/index.ts';
import type { IQueueRepository } from '../src/domain/repositories/queue.repository.interface.ts';
import { HTTP_STATUS, QUEUE_MESSAGES } from '../src/shared/index.ts';

describe('Staff Live Queue List API - GET /staff/restaurants/:restaurantId', () => {
	const restaurantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
	const staffUserId = 'staff-101';
	let queueRepository: IQueueRepository;

	beforeAll(() => {
		queueRepository = container.get<IQueueRepository>(TYPES.Repositories.QueueRepository);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should return 401 Unauthorized when x-user-id header is missing', async () => {
		const res = await request(app)
			.get(`/staff/restaurants/${restaurantId}`)
			.set('Accept', 'application/json');

		expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
		expect(res.body.success).toBe(false);
	});

	it('should return 403 Forbidden when x-user-role is not STAFF or ADMIN', async () => {
		const res = await request(app)
			.get(`/staff/restaurants/${restaurantId}`)
			.set('x-user-id', staffUserId)
			.set('x-user-role', 'CUSTOMER')
			.set('x-restaurant-id', restaurantId)
			.set('Accept', 'application/json');

		expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
		expect(res.body.success).toBe(false);
	});

	it('should return 403 Forbidden when x-restaurant-id does not match the URL restaurantId', async () => {
		const res = await request(app)
			.get(`/staff/restaurants/${restaurantId}`)
			.set('x-user-id', staffUserId)
			.set('x-user-role', 'STAFF')
			.set('x-restaurant-id', '22222222-2222-2222-2222-222222222222')
			.set('Accept', 'application/json');

		expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
		expect(res.body.success).toBe(false);
	});

	it('should return 400 Bad Request when restaurantId is not a valid UUID', async () => {
		const res = await request(app)
			.get('/staff/restaurants/not-a-uuid')
			.set('x-user-id', staffUserId)
			.set('x-user-role', 'STAFF')
			.set('x-restaurant-id', 'not-a-uuid')
			.set('Accept', 'application/json');

		expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
		expect(res.body.success).toBe(false);
	});

	it('should return 400 Bad Request when partySizeBucket is invalid', async () => {
		const res = await request(app)
			.get(`/staff/restaurants/${restaurantId}?partySizeBucket=huge`)
			.set('x-user-id', staffUserId)
			.set('x-user-role', 'STAFF')
			.set('x-restaurant-id', restaurantId)
			.set('Accept', 'application/json');

		expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
		expect(res.body.success).toBe(false);
	});

	it('should return 200 OK with live queue entries and summary counts', async () => {
		const mockEntry1 = QueueEntry.reconstitute({
			id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
			restaurantId,
			guestName: 'John Doe',
			phone: '+15551234567',
			queueNumber: 'W-001',
			partySize: 2,
			registrationType: RegistrationType.WALK_IN,
			position: 1,
			estimatedWaitMinutes: 10,
			estimatedWaitMinutesAtJoin: 10,
			status: QueueStatus.WAITING,
			ringCount: 0,
			lastRingedAt: null,
			fid: null,
			joinedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
			seatedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		jest.spyOn(queueRepository, 'getStaffQueueSnapshot').mockResolvedValue({
			totalWaiting: 1,
			entries: [{ entry: mockEntry1, assignedTableId: null }],
		});

		const res = await request(app)
			.get(`/staff/restaurants/${restaurantId}?partySizeBucket=small&status=WAITING`)
			.set('x-user-id', staffUserId)
			.set('x-user-role', 'STAFF')
			.set('x-restaurant-id', restaurantId)
			.set('Accept', 'application/json');

		expect(res.status).toBe(HTTP_STATUS.OK);
		expect(res.body.success).toBe(true);
		expect(res.body.message).toBe(QUEUE_MESSAGES.QUEUE_RETRIEVED_SUCCESS);
		expect(res.body.data.restaurantId).toBe(restaurantId);
		expect(res.body.data.totalWaiting).toBe(1);
		expect(res.body.data.entries).toHaveLength(1);
		expect(res.body.data.entries[0]).toMatchObject({
			queueEntryId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
			queueNumber: 'W-001',
			position: 1,
			guestName: 'John Doe',
			guestPhone: '+15551234567',
			partySize: 2,
			status: 'WAITING',
			ringCount: 0,
			lastRingAt: null,
			responseDeadline: null,
			assignedTableId: null,
		});
		expect(res.body.data.entries[0].waitDurationMinutes).toBeGreaterThanOrEqual(5);
	});
});
