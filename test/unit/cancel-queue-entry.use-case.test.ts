import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { IQueuePositionRecalculator } from '@application/ports/services/queue-position-recalculator.port.ts';
import type { IRestaurantServiceClient } from '@application/ports/services/restaurant-service.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import { CancelQueueEntryUseCase } from '@application/use-cases/queue/cancel-queue-entry.use-case.ts';
import {
	type IQueueRepository,
	QueueEntry,
	QueueEntryNotFoundError,
	QueueEntryNotWaitingError,
	QueueStatus,
	RegistrationType,
} from '@domain/index.ts';
import { WS_SERVER_EVENTS } from '@shared/constants/websocket.constants.ts';

describe('CancelQueueEntryUseCase Unit Tests', () => {
	let useCase: CancelQueueEntryUseCase;
	let mockQueueRepository: jest.Mocked<IQueueRepository>;
	let mockRestaurantServiceClient: jest.Mocked<IRestaurantServiceClient>;
	let mockQueueCacheService: jest.Mocked<IQueueCacheService>;
	let mockSocketBroadcaster: jest.Mocked<IWebSocketBroadcaster>;
	let mockQueuePositionRecalculator: jest.Mocked<IQueuePositionRecalculator>;

	const restaurantId = '11111111-1111-4111-8111-111111111111';
	const queueEntryId = '22222222-2222-4222-8222-222222222222';
	const staffUserId = 'staff-user-123';

	const createMockQueueEntry = (status: QueueStatus = QueueStatus.WAITING) => {
		return QueueEntry.reconstitute({
			id: queueEntryId,
			restaurantId,
			userId: 'user-1',
			guestName: 'John Doe',
			phone: '+15551234567',
			queueNumber: 'W-001',
			partySize: 4,
			specialNotes: null,
			registrationType: RegistrationType.WALK_IN,
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
			findActiveTableAssignments: jest.fn().mockResolvedValue([]),
			releaseTableAssignments: jest.fn().mockResolvedValue(undefined),
			batchUpdatePositions: jest.fn(),
			getStaffQueueSnapshot: jest.fn(),
		};

		mockRestaurantServiceClient = {
			checkAvailability: jest.fn(),
			getRestaurantStatus: jest.fn(),
			assignTables: jest.fn(),
			releaseTables: jest.fn().mockResolvedValue(undefined),
		};

		mockQueueCacheService = {
			saveLiveEntry: jest.fn().mockResolvedValue(undefined),
			removeLiveEntry: jest.fn().mockResolvedValue(undefined),
			getLiveEntry: jest.fn().mockResolvedValue(null),
		};

		mockSocketBroadcaster = {
			broadcastToRestaurant: jest.fn(),
			broadcastToQueue: jest.fn(),
			sendToTicket: jest.fn(),
		};

		mockQueuePositionRecalculator = {
			recalculate: jest.fn().mockResolvedValue({ affectedCount: 0, updatedEntryIds: [] }),
		};

		useCase = new CancelQueueEntryUseCase(
			mockQueueRepository,
			mockRestaurantServiceClient,
			mockQueueCacheService,
			mockSocketBroadcaster,
			mockQueuePositionRecalculator,
		);
	});

	it('should cancel queue entry and broadcast QUEUE_ENTRY_CANCELLED', async () => {
		const entry = createMockQueueEntry(QueueStatus.WAITING);
		mockQueueRepository.findById.mockResolvedValue(entry);
		mockQueueRepository.updateStatusWithHistory.mockResolvedValue(entry);

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
			reason: 'GUEST_CANCELLED',
			notes: 'Guest decided not to wait',
		});

		expect(result.status).toBe(QueueStatus.CANCELLED);
		expect(result.reason).toBe('GUEST_CANCELLED');
		expect(mockQueueRepository.updateStatusWithHistory).toHaveBeenCalledWith({
			queueEntry: entry,
			previousStatus: QueueStatus.WAITING,
			changedBy: staffUserId,
			reason: 'GUEST_CANCELLED',
			notes: 'Guest decided not to wait',
		});
		expect(mockQueueCacheService.removeLiveEntry).toHaveBeenCalledWith(queueEntryId);
		expect(mockQueuePositionRecalculator.recalculate).toHaveBeenCalledWith(restaurantId);
		expect(mockSocketBroadcaster.broadcastToRestaurant).toHaveBeenCalledWith(
			restaurantId,
			WS_SERVER_EVENTS.QUEUE_ENTRY_CANCELLED,
			expect.objectContaining({ queueEntryId, status: QueueStatus.CANCELLED }),
		);
		expect(mockSocketBroadcaster.sendToTicket).toHaveBeenCalledWith(
			queueEntryId,
			WS_SERVER_EVENTS.QUEUE_ENTRY_CANCELLED,
			expect.objectContaining({ queueEntryId, status: QueueStatus.CANCELLED }),
		);
	});

	it('should mark as NO_SHOW when reason is NO_SHOW and release assigned tables', async () => {
		const entry = createMockQueueEntry(QueueStatus.WAITING);
		mockQueueRepository.findById.mockResolvedValue(entry);
		mockQueueRepository.findActiveTableAssignments.mockResolvedValue([
			{
				id: 'assign-1',
				queueEntryId,
				tableId: 'tbl-1',
				assignedBy: 'staff-1',
				assignedAt: new Date(),
				releasedAt: null,
			},
		]);
		mockQueueRepository.updateStatusWithHistory.mockResolvedValue(entry);

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
			reason: 'NO_SHOW',
			notes: 'No response after 2 rings',
		});

		expect(result.status).toBe(QueueStatus.NO_SHOW);
		expect(result.reason).toBe('NO_SHOW');
		expect(mockRestaurantServiceClient.releaseTables).toHaveBeenCalledWith(restaurantId, [
			{ tableId: 'tbl-1', occupancyToRelease: 4 },
		]);
		expect(mockQueueRepository.releaseTableAssignments).toHaveBeenCalledWith(queueEntryId);
		expect(mockSocketBroadcaster.broadcastToRestaurant).toHaveBeenCalledWith(
			restaurantId,
			WS_SERVER_EVENTS.QUEUE_ENTRY_NO_SHOW,
			expect.objectContaining({ queueEntryId, status: QueueStatus.NO_SHOW }),
		);
	});

	it('should distribute occupancy to release across multiple active table assignments', async () => {
		const entry = createMockQueueEntry(QueueStatus.WAITING);
		mockQueueRepository.findById.mockResolvedValue(entry);
		mockQueueRepository.findActiveTableAssignments.mockResolvedValue([
			{
				id: 'assign-1',
				queueEntryId,
				tableId: 'tbl-1',
				assignedBy: 'staff-1',
				assignedAt: new Date(),
				releasedAt: null,
			},
			{
				id: 'assign-2',
				queueEntryId,
				tableId: 'tbl-2',
				assignedBy: 'staff-1',
				assignedAt: new Date(),
				releasedAt: null,
			},
		]);
		mockQueueRepository.updateStatusWithHistory.mockResolvedValue(entry);

		await useCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
			reason: 'NO_SHOW',
		});

		expect(mockRestaurantServiceClient.releaseTables).toHaveBeenCalledWith(restaurantId, [
			{ tableId: 'tbl-1', occupancyToRelease: 2 },
			{ tableId: 'tbl-2', occupancyToRelease: 2 },
		]);
	});

	it('should throw QueueEntryNotFoundError when entry not found', async () => {
		mockQueueRepository.findById.mockResolvedValue(null);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				staffUserId,
				reason: 'GUEST_CANCELLED',
			}),
		).rejects.toThrow(QueueEntryNotFoundError);
	});

	it('should throw QueueEntryNotWaitingError when entry is already in terminal state', async () => {
		const entry = createMockQueueEntry(QueueStatus.CANCELLED);
		mockQueueRepository.findById.mockResolvedValue(entry);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				staffUserId,
				reason: 'GUEST_CANCELLED',
			}),
		).rejects.toThrow(QueueEntryNotWaitingError);
	});
});
