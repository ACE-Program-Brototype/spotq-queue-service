import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { IQueuePositionRecalculator } from '@application/ports/services/queue-position-recalculator.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import { LeaveQueueUseCase } from '@application/use-cases/leave-queue.use-case.ts';
import {
	ForbiddenTicketAccessError,
	type IQueueRepository,
	QueueCancelReason,
	QueueEntry,
	QueueEntryNotFoundError,
	QueueEntryNotWaitingError,
	QueueStatus,
	RegistrationType,
	WalkInTicketNotAccessibleError,
} from '@domain/index.ts';
import { WS_SERVER_EVENTS } from '@shared/constants/websocket.constants.ts';

describe('LeaveQueueUseCase Unit Tests', () => {
	let useCase: LeaveQueueUseCase;
	let mockQueueRepository: jest.Mocked<IQueueRepository>;
	let mockQueueCacheService: jest.Mocked<IQueueCacheService>;
	let mockSocketBroadcaster: jest.Mocked<IWebSocketBroadcaster>;
	let mockQueuePositionRecalculator: jest.Mocked<IQueuePositionRecalculator>;

	const restaurantId = '11111111-1111-4111-8111-111111111111';
	const queueEntryId = '22222222-2222-4222-8222-222222222222';
	const userId = 'user-owner-123';

	const createMockQueueEntry = (
		status: QueueStatus = QueueStatus.WAITING,
		ownerId: string = userId,
		regType: RegistrationType = RegistrationType.ONLINE,
	) => {
		return QueueEntry.reconstitute({
			id: queueEntryId,
			restaurantId,
			userId: ownerId,
			guestName: 'Jane Doe',
			phone: '+15551234567',
			queueNumber: 'Q-001',
			partySize: 4,
			specialNotes: null,
			registrationType: regType,
			position: 1,
			estimatedWaitMinutes: 15,
			estimatedWaitMinutesAtJoin: 15,
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

	beforeEach(() => {
		mockQueueRepository = {
			findById: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
			save: jest.fn(),
			findPaginated: jest.fn(),
			findActiveEntries: jest.fn(),
			countActiveAhead: jest.fn(),
			sumPartySizeActiveAhead: jest.fn(),
			getActiveQueueMetrics: jest.fn(),
			getRegistrationMetrics: jest.fn(),
			countToday: jest.fn(),
			findActiveByPhone: jest.fn(),
			findActiveByUserId: jest.fn(),
			findActiveByUserIdAndRestaurantId: jest.fn(),
			createWithHistory: jest.fn(),
			assignTablesWithHistory: jest.fn(),
			updateStatusWithHistory: jest.fn(),
			findActiveTableAssignments: jest.fn(),
			releaseTableAssignments: jest.fn(),
			batchUpdatePositions: jest.fn(),
			getStaffQueueSnapshot: jest.fn(),
			countPeopleAheadAtJoin: jest.fn(),
			getCustomerQueueEntrySnapshot: jest.fn(),
		};

		mockQueueCacheService = {
			saveLiveEntry: jest.fn(),
			getLiveEntry: jest.fn(),
			removeLiveEntry: jest.fn().mockResolvedValue(undefined),
		};

		mockSocketBroadcaster = {
			broadcastToRestaurant: jest.fn(),
			broadcastToQueue: jest.fn(),
			sendToTicket: jest.fn(),
		};

		mockQueuePositionRecalculator = {
			recalculate: jest.fn().mockResolvedValue(undefined),
		};

		useCase = new LeaveQueueUseCase(
			mockQueueRepository,
			mockQueueCacheService,
			mockSocketBroadcaster,
			mockQueuePositionRecalculator,
		);
	});

	it('should successfully cancel queue entry and broadcast event', async () => {
		const entry = createMockQueueEntry();
		mockQueueRepository.findById.mockResolvedValue(entry);
		mockQueueRepository.updateStatusWithHistory.mockImplementation(async (params) => {
			return params.queueEntry;
		});

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			userId,
		});

		expect(result.queueEntryId).toBe(queueEntryId);
		expect(result.restaurantId).toBe(restaurantId);
		expect(result.status).toBe(QueueStatus.CANCELLED);
		expect(result.cancelledAt).toBeDefined();

		expect(mockQueueRepository.updateStatusWithHistory).toHaveBeenCalledWith({
			queueEntry: entry,
			previousStatus: QueueStatus.WAITING,
			changedBy: userId,
			reason: QueueCancelReason.GUEST_CANCELLED,
			notes: null,
		});

		expect(mockQueueCacheService.removeLiveEntry).toHaveBeenCalledWith(queueEntryId);
		expect(mockQueuePositionRecalculator.recalculate).toHaveBeenCalledWith(restaurantId);

		expect(mockSocketBroadcaster.broadcastToRestaurant).toHaveBeenCalledWith(
			restaurantId,
			WS_SERVER_EVENTS.QUEUE_ENTRY_CANCELLED,
			expect.objectContaining({
				event: WS_SERVER_EVENTS.QUEUE_ENTRY_CANCELLED,
				queueEntryId,
				status: QueueStatus.CANCELLED,
				reason: QueueCancelReason.GUEST_CANCELLED,
			}),
		);

		expect(mockSocketBroadcaster.sendToTicket).toHaveBeenCalledTimes(1);
		expect(mockSocketBroadcaster.sendToTicket).toHaveBeenCalledWith(
			queueEntryId,
			WS_SERVER_EVENTS.QUEUE_ENTRY_CANCELLED,
			expect.objectContaining({
				queueEntryId,
				status: QueueStatus.CANCELLED,
			}),
		);
	});

	it('should throw QueueEntryNotFoundError when entry does not exist', async () => {
		mockQueueRepository.findById.mockResolvedValue(null);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				userId,
			}),
		).rejects.toThrow(QueueEntryNotFoundError);
	});

	it('should throw QueueEntryNotFoundError when entry restaurantId does not match', async () => {
		const entry = createMockQueueEntry(QueueStatus.WAITING, userId);
		mockQueueRepository.findById.mockResolvedValue(entry);

		await expect(
			useCase.execute({
				restaurantId: '99999999-9999-4999-8999-999999999999',
				queueEntryId,
				userId,
			}),
		).rejects.toThrow(QueueEntryNotFoundError);
	});

	it('should throw WalkInTicketNotAccessibleError when entry is walk-in', async () => {
		const entry = createMockQueueEntry(QueueStatus.WAITING, userId, RegistrationType.WALK_IN);
		mockQueueRepository.findById.mockResolvedValue(entry);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				userId,
			}),
		).rejects.toThrow(WalkInTicketNotAccessibleError);
	});

	it('should throw ForbiddenTicketAccessError when userId does not match', async () => {
		const entry = createMockQueueEntry(QueueStatus.WAITING, 'different-user-456');
		mockQueueRepository.findById.mockResolvedValue(entry);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				userId,
			}),
		).rejects.toThrow(ForbiddenTicketAccessError);
	});

	it('should throw QueueEntryNotWaitingError when entry is not in WAITING status', async () => {
		const entry = createMockQueueEntry(QueueStatus.SEATED);
		mockQueueRepository.findById.mockResolvedValue(entry);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				userId,
			}),
		).rejects.toThrow(QueueEntryNotWaitingError);
	});
});
