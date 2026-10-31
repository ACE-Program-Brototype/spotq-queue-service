import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { IQueuePositionRecalculator } from '@application/ports/services/queue-position-recalculator.port.ts';
import type { IRestaurantServiceClient } from '@application/ports/services/restaurant-service.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import { SeatPartyUseCase } from '@application/use-cases/seat-party.use-case.ts';
import {
	type IQueueRepository,
	QueueEntry,
	QueueEntryNotFoundError,
	QueueEntryNotWaitingError,
	QueueStatus,
	RegistrationType,
} from '@domain/index.ts';
import { WS_SERVER_EVENTS } from '@shared/constants/websocket.constants.ts';

describe('SeatPartyUseCase Unit Tests', () => {
	let useCase: SeatPartyUseCase;
	let mockQueueRepository: jest.Mocked<IQueueRepository>;
	let mockRestaurantServiceClient: jest.Mocked<IRestaurantServiceClient>;
	let mockQueueCacheService: jest.Mocked<IQueueCacheService>;
	let mockSocketBroadcaster: jest.Mocked<IWebSocketBroadcaster>;
	let mockQueuePositionRecalculator: jest.Mocked<IQueuePositionRecalculator>;

	const restaurantId = '11111111-1111-4111-8111-111111111111';
	const queueEntryId = '22222222-2222-4222-8222-222222222222';
	const staffUserId = 'staff-user-123';
	const tableIds = ['33333333-3333-4333-8333-333333333333'];

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
		};

		mockRestaurantServiceClient = {
			checkAvailability: jest.fn(),
			getRestaurantStatus: jest.fn(),
			assignTables: jest.fn().mockResolvedValue(undefined),
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

		useCase = new SeatPartyUseCase(
			mockQueueRepository,
			mockRestaurantServiceClient,
			mockQueueCacheService,
			mockSocketBroadcaster,
			mockQueuePositionRecalculator,
		);
	});

	it('should seat party successfully and trigger position recalculation and events', async () => {
		const entry = createMockQueueEntry(QueueStatus.WAITING);
		mockQueueRepository.findById.mockResolvedValue(entry);
		mockQueueRepository.assignTablesWithHistory.mockResolvedValue(entry);

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
			tableIds,
		});

		expect(result.status).toBe(QueueStatus.SEATED);
		expect(result.tableIds).toEqual(tableIds);
		expect(mockRestaurantServiceClient.assignTables).toHaveBeenCalledWith(restaurantId, [
			{ tableId: tableIds[0], count: 4 },
		]);
		expect(mockQueueRepository.assignTablesWithHistory).toHaveBeenCalledWith(
			entry,
			tableIds,
			staffUserId,
			QueueStatus.WAITING,
		);
		expect(mockQueueCacheService.removeLiveEntry).toHaveBeenCalledWith(queueEntryId);
		expect(mockQueuePositionRecalculator.recalculate).toHaveBeenCalledWith(restaurantId);
		expect(mockSocketBroadcaster.broadcastToRestaurant).toHaveBeenCalledWith(
			restaurantId,
			WS_SERVER_EVENTS.QUEUE_ENTRY_SEATED,
			expect.objectContaining({ queueEntryId, status: QueueStatus.SEATED }),
		);
		expect(mockSocketBroadcaster.sendToTicket).toHaveBeenCalledWith(
			queueEntryId,
			WS_SERVER_EVENTS.QUEUE_ENTRY_SEATED,
			expect.objectContaining({ queueEntryId, status: QueueStatus.SEATED }),
		);
	});

	it('should throw QueueEntryNotFoundError when entry does not exist', async () => {
		mockQueueRepository.findById.mockResolvedValue(null);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				staffUserId,
				tableIds,
			}),
		).rejects.toThrow(QueueEntryNotFoundError);
	});

	it('should throw QueueEntryNotFoundError when restaurantId does not match', async () => {
		const entry = createMockQueueEntry(QueueStatus.WAITING);
		mockQueueRepository.findById.mockResolvedValue(entry);

		await expect(
			useCase.execute({
				restaurantId: 'other-restaurant',
				queueEntryId,
				staffUserId,
				tableIds,
			}),
		).rejects.toThrow(QueueEntryNotFoundError);
	});

	it('should throw QueueEntryNotWaitingError when entry is already seated', async () => {
		const entry = createMockQueueEntry(QueueStatus.SEATED);
		mockQueueRepository.findById.mockResolvedValue(entry);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				staffUserId,
				tableIds,
			}),
		).rejects.toThrow(QueueEntryNotWaitingError);
	});
});
