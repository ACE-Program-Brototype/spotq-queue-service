import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { IQueuePositionRecalculator } from '@application/ports/services/queue-position-recalculator.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import { SkipPartyUseCase } from '@application/use-cases/queue/skip-party.use-case.ts';
import {
	type IQueueRepository,
	QueueEntry,
	QueueEntryNotFoundError,
	QueueEntryNotWaitingError,
	QueueStatus,
	RegistrationType,
} from '@domain/index.ts';
import { WS_SERVER_EVENTS } from '@shared/constants/websocket.constants.ts';

describe('SkipPartyUseCase Unit Tests', () => {
	let useCase: SkipPartyUseCase;
	let mockQueueRepository: jest.Mocked<IQueueRepository>;
	let mockQueueCacheService: jest.Mocked<IQueueCacheService>;
	let mockSocketBroadcaster: jest.Mocked<IWebSocketBroadcaster>;
	let mockQueuePositionRecalculator: jest.Mocked<IQueuePositionRecalculator>;

	const restaurantId = '11111111-1111-4111-8111-111111111111';
	const queueEntryId = '22222222-2222-4222-8222-222222222222';
	const staffUserId = 'staff-user-123';
	const reason = 'Party not present at host stand';

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
			findActiveTableAssignments: jest.fn(),
			releaseTableAssignments: jest.fn(),
			batchUpdatePositions: jest.fn(),
			getStaffQueueSnapshot: jest.fn(),
			countPeopleAheadAtJoin: jest.fn(),
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

		useCase = new SkipPartyUseCase(
			mockQueueRepository,
			mockQueueCacheService,
			mockSocketBroadcaster,
			mockQueuePositionRecalculator,
		);
	});

	it('should transition entry to SKIPPED when skipPositions is omitted', async () => {
		const entry = createMockQueueEntry(QueueStatus.WAITING);
		mockQueueRepository.findById.mockResolvedValue(entry);
		mockQueueRepository.updateStatusWithHistory.mockResolvedValue(entry);

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
			reason,
		});

		expect(result.status).toBe(QueueStatus.SKIPPED);
		expect(result.position).toBeNull();
		expect(mockQueueRepository.updateStatusWithHistory).toHaveBeenCalledWith({
			queueEntry: entry,
			previousStatus: QueueStatus.WAITING,
			changedBy: staffUserId,
			reason,
		});
		expect(mockQueueCacheService.removeLiveEntry).toHaveBeenCalledWith(queueEntryId);
		expect(mockQueuePositionRecalculator.recalculate).toHaveBeenCalledWith(restaurantId);
		expect(mockSocketBroadcaster.broadcastToRestaurant).toHaveBeenCalledWith(
			restaurantId,
			WS_SERVER_EVENTS.QUEUE_ENTRY_SKIPPED,
			expect.objectContaining({ queueEntryId, status: QueueStatus.SKIPPED, reason }),
		);
		expect(mockSocketBroadcaster.sendToTicket).toHaveBeenCalledWith(
			queueEntryId,
			WS_SERVER_EVENTS.QUEUE_ENTRY_SKIPPED,
			expect.objectContaining({ queueEntryId, status: QueueStatus.SKIPPED, reason }),
		);
	});

	it('should reorder entry when skipPositions is provided and remaining entries allow it', async () => {
		const entry = createMockQueueEntry(QueueStatus.WAITING);
		const entry2 = QueueEntry.reconstitute({
			...entry.toJSON(),
			id: 'entry-2',
			position: 2,
			joinedAt: new Date(Date.now() + 1000),
		});
		const entry3 = QueueEntry.reconstitute({
			...entry.toJSON(),
			id: 'entry-3',
			position: 3,
			joinedAt: new Date(Date.now() + 2000),
		});

		mockQueueRepository.findById.mockResolvedValue(entry);
		mockQueueRepository.findActiveEntries.mockResolvedValue([entry, entry2, entry3]);

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
			reason,
			skipPositions: 2,
		});

		expect(result.status).toBe(QueueStatus.WAITING);
		expect(result.position).toBe(3);
		expect(entry.position).toBe(3);
		expect(mockQueueRepository.batchUpdatePositions).toHaveBeenCalledWith([
			{ id: 'entry-2', position: 1 },
			{ id: 'entry-3', position: 2 },
			{ id: queueEntryId, position: 3 },
		]);
		expect(mockQueueRepository.updateStatusWithHistory).toHaveBeenCalledWith({
			queueEntry: entry,
			previousStatus: QueueStatus.WAITING,
			changedBy: staffUserId,
			reason: `${reason} (shifted by 2 positions)`,
		});
		expect(mockQueuePositionRecalculator.recalculate).toHaveBeenCalledWith(restaurantId);
		expect(mockSocketBroadcaster.broadcastToRestaurant).toHaveBeenCalledWith(
			restaurantId,
			WS_SERVER_EVENTS.QUEUE_ENTRY_SKIPPED,
			expect.objectContaining({ queueEntryId, status: QueueStatus.WAITING, position: 3 }),
		);
		expect(mockSocketBroadcaster.sendToTicket).toHaveBeenCalledWith(
			queueEntryId,
			WS_SERVER_EVENTS.QUEUE_ENTRY_SKIPPED,
			expect.objectContaining({ queueEntryId, status: QueueStatus.WAITING, position: 3 }),
		);
	});

	it('should throw QueueEntryNotFoundError when entry not found', async () => {
		mockQueueRepository.findById.mockResolvedValue(null);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				staffUserId,
				reason,
			}),
		).rejects.toThrow(QueueEntryNotFoundError);
	});

	it('should throw QueueEntryNotWaitingError when entry is already in terminal state', async () => {
		const entry = createMockQueueEntry(QueueStatus.SKIPPED);
		mockQueueRepository.findById.mockResolvedValue(entry);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				staffUserId,
				reason,
			}),
		).rejects.toThrow(QueueEntryNotWaitingError);
	});
});
