import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { IEtaService } from '@application/ports/services/eta-service.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import { type IQueueRepository, QueueEntry, QueueStatus, RegistrationType } from '@domain/index.ts';
import { QueuePositionRecalculator } from '@infrastructure/services/queue-position-recalculator.service.ts';
import { WS_SERVER_EVENTS } from '@shared/constants/websocket.constants.ts';

describe('QueuePositionRecalculator Unit Tests', () => {
	let recalculator: QueuePositionRecalculator;
	let mockQueueRepository: jest.Mocked<IQueueRepository>;
	let mockEtaService: jest.Mocked<IEtaService>;
	let mockQueueCacheService: jest.Mocked<IQueueCacheService>;
	let mockSocketBroadcaster: jest.Mocked<IWebSocketBroadcaster>;

	const restaurantId = '11111111-1111-4111-8111-111111111111';

	const createEntry = (id: string, position: number, partySize: number, eta: number) => {
		return QueueEntry.reconstitute({
			id,
			restaurantId,
			userId: null,
			guestName: `Guest ${id}`,
			phone: '+15550000000',
			queueNumber: 'W-001',
			partySize,
			specialNotes: null,
			registrationType: RegistrationType.WALK_IN,
			position,
			estimatedWaitMinutes: eta,
			estimatedWaitMinutesAtJoin: eta,
			status: QueueStatus.WAITING,
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
			batchUpdatePositions: jest.fn().mockResolvedValue(undefined),
			getStaffQueueSnapshot: jest.fn(),
			countPeopleAheadAtJoin: jest.fn(),
			getCustomerQueueEntrySnapshot: jest.fn(),
		};

		mockEtaService = {
			predictEta: jest.fn(),
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

		recalculator = new QueuePositionRecalculator(
			mockQueueRepository,
			mockEtaService,
			mockQueueCacheService,
			mockSocketBroadcaster,
		);
	});

	it('should return 0 affected count when queue is empty', async () => {
		mockQueueRepository.findActiveEntries.mockResolvedValue([]);

		const result = await recalculator.recalculate(restaurantId);

		expect(result.affectedCount).toBe(0);
		expect(result.updatedEntryIds).toEqual([]);
		expect(mockQueueRepository.batchUpdatePositions).not.toHaveBeenCalled();
	});

	it('should recalculate positions, update database and emit deltas only when changed', async () => {
		const entry1 = createEntry('entry-1', 2, 2, 10);
		const entry2 = createEntry('entry-2', 3, 4, 20);

		mockQueueRepository.findActiveEntries.mockResolvedValue([entry1, entry2]);
		mockEtaService.predictEta.mockResolvedValueOnce(5).mockResolvedValueOnce(15);

		const result = await recalculator.recalculate(restaurantId);

		expect(result.affectedCount).toBe(2);
		expect(result.updatedEntryIds).toEqual(['entry-1', 'entry-2']);
		expect(mockQueueRepository.batchUpdatePositions).toHaveBeenCalledWith([
			{ id: 'entry-1', position: 1, estimatedWaitMinutes: 5 },
			{ id: 'entry-2', position: 2, estimatedWaitMinutes: 15 },
		]);
		expect(mockSocketBroadcaster.sendToTicket).toHaveBeenCalledTimes(2);
		expect(mockSocketBroadcaster.broadcastToRestaurant).toHaveBeenCalledWith(
			restaurantId,
			WS_SERVER_EVENTS.QUEUE_POSITION_UPDATED,
			expect.objectContaining({
				restaurantId,
				updatedEntries: expect.arrayContaining([
					expect.objectContaining({ queueEntryId: 'entry-1', position: 1 }),
					expect.objectContaining({ queueEntryId: 'entry-2', position: 2 }),
				]),
			}),
		);
	});

	it('should not update or emit when positions and ETAs have not changed', async () => {
		const entry1 = createEntry('entry-1', 1, 2, 5);
		mockQueueRepository.findActiveEntries.mockResolvedValue([entry1]);
		mockEtaService.predictEta.mockResolvedValue(5);

		const result = await recalculator.recalculate(restaurantId);

		expect(result.affectedCount).toBe(0);
		expect(mockQueueRepository.batchUpdatePositions).not.toHaveBeenCalled();
		expect(mockSocketBroadcaster.sendToTicket).not.toHaveBeenCalled();
	});
});
