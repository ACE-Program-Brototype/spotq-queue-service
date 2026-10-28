import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { IRestaurantServiceClient } from '@application/ports/services/restaurant-service.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import { AssignTableUseCase } from '@application/use-cases/assign-table.use-case.ts';
import {
	InsufficientTableCapacityError,
	type IQueueRepository,
	QueueEntry,
	QueueEntryNotFoundError,
	QueueEntryNotWaitingError,
	QueueStatus,
	RegistrationType,
} from '@domain/index.ts';
import { WS_SERVER_EVENTS } from '@shared/index.ts';

describe('AssignTableUseCase', () => {
	let useCase: AssignTableUseCase;
	let mockQueueRepository: jest.Mocked<IQueueRepository>;
	let mockRestaurantServiceClient: jest.Mocked<IRestaurantServiceClient>;
	let mockQueueCacheService: jest.Mocked<IQueueCacheService>;
	let mockSocketBroadcaster: jest.Mocked<IWebSocketBroadcaster>;

	const restaurantId = '11111111-1111-4111-8111-111111111111';
	const queueEntryId = '22222222-2222-4222-8222-222222222222';
	const staffUserId = 'staff-user-123';
	const tableId1 = '33333333-3333-4333-8333-333333333333';
	const tableId2 = '44444444-4444-4444-8444-444444444444';

	const createMockQueueEntry = (status: QueueStatus = QueueStatus.WAITING, partySize = 4) => {
		return QueueEntry.reconstitute({
			id: queueEntryId,
			restaurantId,
			userId: 'user-1',
			guestName: 'John Doe',
			phone: '+15551234567',
			queueNumber: 'W-001',
			partySize,
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
			findActiveByRestaurantAndUserId: jest.fn(),
			createWithHistory: jest.fn(),
			assignTablesWithHistory: jest.fn(),
		};

		mockRestaurantServiceClient = {
			checkAvailability: jest.fn(),
			getRestaurantStatus: jest.fn(),
			assignTables: jest.fn().mockResolvedValue(undefined),
		};

		mockQueueCacheService = {
			saveLiveEntry: jest.fn().mockResolvedValue(undefined),
			getLiveEntry: jest.fn(),
			removeLiveEntry: jest.fn().mockResolvedValue(undefined),
		};

		mockSocketBroadcaster = {
			broadcastToRestaurant: jest.fn(),
			broadcastToQueue: jest.fn(),
			sendToTicket: jest.fn(),
		};

		useCase = new AssignTableUseCase(
			mockQueueRepository,
			mockRestaurantServiceClient,
			mockQueueCacheService,
			mockSocketBroadcaster,
		);
	});

	it('should successfully assign tables to a waiting queue entry', async () => {
		const entry = createMockQueueEntry(QueueStatus.WAITING, 4);
		mockQueueRepository.findById.mockResolvedValue(entry);
		mockQueueRepository.assignTablesWithHistory.mockImplementation(async (e) => e);

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
			tables: [
				{ tableId: tableId1, count: 2 },
				{ tableId: tableId2, count: 2 },
			],
		});

		expect(result).toBeDefined();
		expect(result.queueEntryId).toBe(queueEntryId);
		expect(result.restaurantId).toBe(restaurantId);
		expect(result.tableIds).toEqual([tableId1, tableId2]);
		expect(result.status).toBe(QueueStatus.SEATED);
		expect(result.seatedAt).toBeDefined();

		// Verify S2S call
		expect(mockRestaurantServiceClient.assignTables).toHaveBeenCalledWith(restaurantId, [
			{ tableId: tableId1, count: 2 },
			{ tableId: tableId2, count: 2 },
		]);

		// Verify atomic persistence
		expect(mockQueueRepository.assignTablesWithHistory).toHaveBeenCalledWith(
			entry,
			[tableId1, tableId2],
			staffUserId,
			QueueStatus.WAITING,
		);

		// Verify cache invalidation
		expect(mockQueueCacheService.removeLiveEntry).toHaveBeenCalledWith(queueEntryId);

		// Verify WebSocket broadcast
		expect(mockSocketBroadcaster.broadcastToRestaurant).toHaveBeenCalledWith(
			restaurantId,
			WS_SERVER_EVENTS.TICKET_SEATED,
			expect.objectContaining({
				event: WS_SERVER_EVENTS.TICKET_SEATED,
				queueEntryId,
				tableIds: [tableId1, tableId2],
				status: QueueStatus.SEATED,
			}),
		);
		expect(mockSocketBroadcaster.sendToTicket).toHaveBeenCalledWith(
			queueEntryId,
			WS_SERVER_EVENTS.TICKET_SEATED,
			expect.objectContaining({
				queueEntryId,
				tableIds: [tableId1, tableId2],
				status: QueueStatus.SEATED,
			}),
		);
	});

	it('should throw QueueEntryNotFoundError if ticket does not exist', async () => {
		mockQueueRepository.findById.mockResolvedValue(null);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				staffUserId,
				tables: [{ tableId: tableId1, count: 4 }],
			}),
		).rejects.toThrow(QueueEntryNotFoundError);

		expect(mockRestaurantServiceClient.assignTables).not.toHaveBeenCalled();
	});

	it('should throw QueueEntryNotFoundError if ticket belongs to a different restaurant', async () => {
		const entry = createMockQueueEntry(QueueStatus.WAITING, 4);
		mockQueueRepository.findById.mockResolvedValue(entry);

		await expect(
			useCase.execute({
				restaurantId: '99999999-9999-4999-8999-999999999999',
				queueEntryId,
				staffUserId,
				tables: [{ tableId: tableId1, count: 4 }],
			}),
		).rejects.toThrow(QueueEntryNotFoundError);

		expect(mockRestaurantServiceClient.assignTables).not.toHaveBeenCalled();
	});

	it('should throw InsufficientTableCapacityError if total table seats is less than party size', async () => {
		const entry = createMockQueueEntry(QueueStatus.WAITING, 6);
		mockQueueRepository.findById.mockResolvedValue(entry);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				staffUserId,
				tables: [{ tableId: tableId1, count: 4 }],
			}),
		).rejects.toThrow(InsufficientTableCapacityError);

		expect(mockRestaurantServiceClient.assignTables).not.toHaveBeenCalled();
	});

	it('should throw QueueEntryNotWaitingError if ticket status is not WAITING', async () => {
		const entry = createMockQueueEntry(QueueStatus.SEATED, 4);
		mockQueueRepository.findById.mockResolvedValue(entry);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				staffUserId,
				tables: [{ tableId: tableId1, count: 4 }],
			}),
		).rejects.toThrow(QueueEntryNotWaitingError);

		expect(mockRestaurantServiceClient.assignTables).not.toHaveBeenCalled();
	});

	it('should propagate upstream error if restaurant service fails without persisting to DB', async () => {
		const entry = createMockQueueEntry(QueueStatus.WAITING, 4);
		mockQueueRepository.findById.mockResolvedValue(entry);
		mockRestaurantServiceClient.assignTables.mockRejectedValue(
			new Error('Table occupied upstream'),
		);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				staffUserId,
				tables: [{ tableId: tableId1, count: 4 }],
			}),
		).rejects.toThrow('Table occupied upstream');

		expect(mockQueueRepository.assignTablesWithHistory).not.toHaveBeenCalled();
		expect(mockQueueCacheService.removeLiveEntry).not.toHaveBeenCalled();
	});
});
