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
import { HTTP_STATUS, QUEUE_MESSAGES } from '../src/shared/index.ts';

describe('Customer Leave Queue API Integration Tests', () => {
	const validRestaurantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
	const validQueueEntryId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
	const validUserId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

	const customerEndpoint = `/customer/restaurants/${validRestaurantId}/queue/leave`;
	const directEndpoint = `/restaurants/${validRestaurantId}/queue/leave`;

	let queueRepository: IQueueRepository;

	const createMockEntry = (
		status: QueueStatus = QueueStatus.WAITING,
		ownerId: string = validUserId,
		regType: RegistrationType = RegistrationType.ONLINE,
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
			registrationType: regType,
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
		jest.spyOn(queueRepository, 'findActiveEntries').mockResolvedValue([]);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should return 200 and cancel queue entry when request is valid via customer prefix', async () => {
		const mockEntry = createMockEntry();
		jest.spyOn(queueRepository, 'findById').mockResolvedValue(mockEntry);
		jest
			.spyOn(queueRepository, 'updateStatusWithHistory')
			.mockImplementation(async (params) => params.queueEntry);

		const response = await request(app)
			.post(customerEndpoint)
			.set('x-user-id', validUserId)
			.send({ queueEntryId: validQueueEntryId });

		expect(response.status).toBe(HTTP_STATUS.OK);
		expect(response.body.success).toBe(true);
		expect(response.body.message).toBe(QUEUE_MESSAGES.CUSTOMER_LEAVE_QUEUE_SUCCESS);
		expect(response.body.data.queueEntryId).toBe(validQueueEntryId);
		expect(response.body.data.restaurantId).toBe(validRestaurantId);
		expect(response.body.data.status).toBe(QueueStatus.CANCELLED);
	});

	it('should return 404 via direct endpoint without customer prefix', async () => {
		const response = await request(app)
			.post(directEndpoint)
			.set('x-user-id', validUserId)
			.send({ queueEntryId: validQueueEntryId });

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
	});

	it('should return 401 when x-user-id header is missing', async () => {
		const response = await request(app)
			.post(customerEndpoint)
			.send({ queueEntryId: validQueueEntryId });

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
		expect(response.body.success).toBe(false);
	});

	it('should return 422 when queueEntryId is invalid UUID format in body', async () => {
		const response = await request(app)
			.post(customerEndpoint)
			.set('x-user-id', validUserId)
			.send({ queueEntryId: 'not-a-valid-uuid' });

		expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
		expect(response.body.success).toBe(false);
	});

	it('should return 400 when restaurantId is invalid UUID format in params', async () => {
		const response = await request(app)
			.post('/customer/restaurants/invalid-restaurant-uuid/queue/leave')
			.set('x-user-id', validUserId)
			.send({ queueEntryId: validQueueEntryId });

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
		expect(response.body.success).toBe(false);
	});

	it('should return 404 when queue entry is not found', async () => {
		jest.spyOn(queueRepository, 'findById').mockResolvedValue(null);

		const response = await request(app)
			.post(customerEndpoint)
			.set('x-user-id', validUserId)
			.send({ queueEntryId: validQueueEntryId });

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
		expect(response.body.success).toBe(false);
	});

	it('should return 403 when user does not own the queue entry', async () => {
		const mockEntry = createMockEntry(QueueStatus.WAITING, 'another-user-uuid');
		jest.spyOn(queueRepository, 'findById').mockResolvedValue(mockEntry);

		const response = await request(app)
			.post(customerEndpoint)
			.set('x-user-id', validUserId)
			.send({ queueEntryId: validQueueEntryId });

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
		expect(response.body.success).toBe(false);
	});

	it('should return 403 when trying to leave a walk-in entry', async () => {
		const mockEntry = createMockEntry(QueueStatus.WAITING, validUserId, RegistrationType.WALK_IN);
		jest.spyOn(queueRepository, 'findById').mockResolvedValue(mockEntry);

		const response = await request(app)
			.post(customerEndpoint)
			.set('x-user-id', validUserId)
			.send({ queueEntryId: validQueueEntryId });

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
		expect(response.body.success).toBe(false);
	});

	it('should return 409 when queue entry is already SEATED', async () => {
		const mockEntry = createMockEntry(QueueStatus.SEATED);
		jest.spyOn(queueRepository, 'findById').mockResolvedValue(mockEntry);

		const response = await request(app)
			.post(customerEndpoint)
			.set('x-user-id', validUserId)
			.send({ queueEntryId: validQueueEntryId });

		expect(response.status).toBe(HTTP_STATUS.CONFLICT);
		expect(response.body.success).toBe(false);
	});
});
