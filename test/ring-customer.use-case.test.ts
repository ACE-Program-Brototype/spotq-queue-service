import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import { RingCustomerUseCase } from '@application/use-cases/ring-customer.use-case.ts';
import {
	CannotRingWalkInCustomerError,
	type IQueueRepository,
	type IQueueService,
	QueueEntry,
	QueueEntryNotFoundError,
	QueueEntryNotWaitingError,
	QueueStatus,
	RegistrationType,
} from '@domain/index.ts';
import { JOB_NAMES, QUEUE_NAMES } from '@infrastructure/queue/queue.constants.ts';
import { WS_SERVER_EVENTS } from '@shared/index.ts';

describe('RingCustomerUseCase Unit Tests', () => {
	let useCase: RingCustomerUseCase;
	let mockQueueRepository: jest.Mocked<IQueueRepository>;
	let mockQueueService: jest.Mocked<IQueueService>;
	let mockSocketBroadcaster: jest.Mocked<IWebSocketBroadcaster>;

	const restaurantId = '11111111-1111-4111-8111-111111111111';
	const queueEntryId = '22222222-2222-4222-8222-222222222222';
	const staffUserId = 'staff-user-123';
	const validFid = 'fcm-device-fid-12345';

	const createMockQueueEntry = (
		options: {
			status?: QueueStatus;
			registrationType?: RegistrationType;
			fid?: string | null;
			ringCount?: number;
		} = {},
	) => {
		const {
			status = QueueStatus.WAITING,
			registrationType = RegistrationType.ONLINE,
			fid = validFid,
			ringCount = 0,
		} = options;

		return QueueEntry.reconstitute({
			id: queueEntryId,
			restaurantId,
			userId: 'user-1',
			guestName: 'Jane Doe',
			phone: '+15551234567',
			queueNumber: 'Q-001',
			partySize: 2,
			specialNotes: null,
			registrationType,
			position: 1,
			estimatedWaitMinutes: 10,
			estimatedWaitMinutesAtJoin: 10,
			status,
			ringCount,
			lastRingedAt: null,
			fid,
			joinedAt: new Date(),
			seatedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	};

	beforeEach(() => {
		mockQueueRepository = {
			findById: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
			save: jest.fn().mockResolvedValue(undefined),
			findPaginated: jest.fn(),
			findActiveEntries: jest.fn(),
			countActiveAhead: jest.fn(),
			sumPartySizeActiveAhead: jest.fn(),
			getActiveQueueMetrics: jest.fn(),
			countToday: jest.fn(),
			findActiveByPhone: jest.fn(),
			createWithHistory: jest.fn(),
			assignTablesWithHistory: jest.fn(),
		};

		mockQueueService = {
			addJob: jest.fn().mockResolvedValue({
				id: 'job-1',
				name: JOB_NAMES.SEND_PUSH_NOTIFICATION,
				data: {},
				timestamp: Date.now(),
			}),
			isHealthy: jest.fn().mockResolvedValue(true),
			close: jest.fn().mockResolvedValue(undefined),
		};

		mockSocketBroadcaster = {
			broadcastToRestaurant: jest.fn(),
			broadcastToQueue: jest.fn(),
			sendToTicket: jest.fn(),
		};

		useCase = new RingCustomerUseCase(mockQueueRepository, mockQueueService, mockSocketBroadcaster);
	});

	it('should successfully ring an online customer with FID, enqueuing FCM push and sending WebSocket event', async () => {
		const entry = createMockQueueEntry({ fid: validFid, ringCount: 0 });
		mockQueueRepository.findById.mockResolvedValue(entry);

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
		});

		expect(result).toBeDefined();
		expect(result.queueEntryId).toBe(queueEntryId);
		expect(result.restaurantId).toBe(restaurantId);
		expect(result.guestName).toBe('Jane Doe');
		expect(result.ringCount).toBe(1);
		expect(result.lastRingedAt).toBeDefined();
		expect(result.notificationDispatched).toBe(true);

		// Verify repository persisted incremented ringCount
		expect(mockQueueRepository.save).toHaveBeenCalledWith(entry);
		expect(entry.ringCount).toBe(1);
		expect(entry.lastRingedAt).toBeInstanceOf(Date);

		// Verify BullMQ job was enqueued
		expect(mockQueueService.addJob).toHaveBeenCalledWith(
			QUEUE_NAMES.PUSH_NOTIFICATIONS,
			JOB_NAMES.SEND_PUSH_NOTIFICATION,
			expect.objectContaining({
				fid: validFid,
				title: 'Your Table is Ready! 🍽️',
				data: expect.objectContaining({
					queueEntryId,
					restaurantId,
				}),
			}),
			expect.any(Object),
		);

		// Verify WebSocket event was sent to private ticket room
		expect(mockSocketBroadcaster.sendToTicket).toHaveBeenCalledWith(
			queueEntryId,
			WS_SERVER_EVENTS.TICKET_CALLED,
			expect.objectContaining({
				event: WS_SERVER_EVENTS.TICKET_CALLED,
				queueEntryId,
				restaurantId,
				ringCount: 1,
			}),
		);
	});

	it('should successfully ring an online customer WITHOUT FID (push notification skipped, socket emitted)', async () => {
		const entry = createMockQueueEntry({ fid: null, ringCount: 1 });
		mockQueueRepository.findById.mockResolvedValue(entry);

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
		});

		expect(result.ringCount).toBe(2);
		expect(result.notificationDispatched).toBe(false);

		// Push notification not dispatched without FID
		expect(mockQueueService.addJob).not.toHaveBeenCalled();

		// WebSocket event still sent to ticket screen
		expect(mockSocketBroadcaster.sendToTicket).toHaveBeenCalledWith(
			queueEntryId,
			WS_SERVER_EVENTS.TICKET_CALLED,
			expect.objectContaining({
				ringCount: 2,
			}),
		);
	});

	it('should throw CannotRingWalkInCustomerError if customer is a walk-in', async () => {
		const entry = createMockQueueEntry({ registrationType: RegistrationType.WALK_IN });
		mockQueueRepository.findById.mockResolvedValue(entry);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				staffUserId,
			}),
		).rejects.toThrow(CannotRingWalkInCustomerError);

		expect(mockQueueRepository.save).not.toHaveBeenCalled();
		expect(mockQueueService.addJob).not.toHaveBeenCalled();
		expect(mockSocketBroadcaster.sendToTicket).not.toHaveBeenCalled();
	});

	it('should throw QueueEntryNotWaitingError if customer status is not WAITING (e.g. SEATED)', async () => {
		const entry = createMockQueueEntry({ status: QueueStatus.SEATED });
		mockQueueRepository.findById.mockResolvedValue(entry);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				staffUserId,
			}),
		).rejects.toThrow(QueueEntryNotWaitingError);

		expect(mockQueueRepository.save).not.toHaveBeenCalled();
		expect(mockQueueService.addJob).not.toHaveBeenCalled();
		expect(mockSocketBroadcaster.sendToTicket).not.toHaveBeenCalled();
	});

	it('should throw QueueEntryNotFoundError if ticket does not exist', async () => {
		mockQueueRepository.findById.mockResolvedValue(null);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				staffUserId,
			}),
		).rejects.toThrow(QueueEntryNotFoundError);

		expect(mockQueueRepository.save).not.toHaveBeenCalled();
	});

	it('should throw QueueEntryNotFoundError if ticket belongs to a different restaurant', async () => {
		const entry = createMockQueueEntry();
		mockQueueRepository.findById.mockResolvedValue(entry);

		await expect(
			useCase.execute({
				restaurantId: '99999999-9999-4999-8999-999999999999',
				queueEntryId,
				staffUserId,
			}),
		).rejects.toThrow(QueueEntryNotFoundError);

		expect(mockQueueRepository.save).not.toHaveBeenCalled();
	});

	it('should succeed even if BullMQ enqueuing fails (non-blocking)', async () => {
		const entry = createMockQueueEntry({ fid: validFid });
		mockQueueRepository.findById.mockResolvedValue(entry);
		mockQueueService.addJob.mockRejectedValue(new Error('Redis connection down'));

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
		});

		expect(result).toBeDefined();
		expect(result.ringCount).toBe(1);
		expect(result.notificationDispatched).toBe(false);
		expect(mockSocketBroadcaster.sendToTicket).toHaveBeenCalled();
	});

	it('should succeed even if WebSocket broadcasting fails (non-blocking)', async () => {
		const entry = createMockQueueEntry({ fid: validFid });
		mockQueueRepository.findById.mockResolvedValue(entry);
		mockSocketBroadcaster.sendToTicket.mockImplementation(() => {
			throw new Error('Socket IO error');
		});

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
		});

		expect(result).toBeDefined();
		expect(result.ringCount).toBe(1);
	});
});
