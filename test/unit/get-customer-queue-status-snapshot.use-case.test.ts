import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { ILogger } from '@application/ports/services/logger-service.port.ts';
import type { IRestaurantServiceClient } from '@application/ports/services/restaurant-service.port.ts';
import { GetCustomerQueueStatusSnapshotUseCase } from '@application/use-cases/get-customer-queue-status-snapshot.use-case.ts';
import {
	ForbiddenTicketAccessError,
	type IQueueRepository,
	QueueEntry,
	QueueEntryNotFoundError,
	QueueStatus,
	RegistrationType,
	WalkInTicketNotAccessibleError,
} from '@domain/index.ts';

describe('GetCustomerQueueStatusSnapshotUseCase Unit Tests', () => {
	let useCase: GetCustomerQueueStatusSnapshotUseCase;
	let mockQueueRepository: jest.Mocked<IQueueRepository> & {
		getCustomerQueueEntrySnapshot: jest.Mock;
	};
	let mockRestaurantServiceClient: jest.Mocked<IRestaurantServiceClient>;
	let mockQueueCacheService: jest.Mocked<IQueueCacheService>;
	let mockLogger: jest.Mocked<ILogger>;

	const restaurantId = '11111111-1111-4111-8111-111111111111';
	const queueEntryId = '22222222-2222-4222-8222-222222222222';
	const userId = '33333333-3333-4333-8333-333333333333';

	const createMockQueueEntry = (
		overrides: Partial<Parameters<typeof QueueEntry.reconstitute>[0]> = {},
	) => {
		return QueueEntry.reconstitute({
			id: queueEntryId,
			restaurantId,
			userId,
			guestName: 'Jane Doe',
			phone: '+15551234567',
			queueNumber: 'Q-001',
			partySize: 2,
			specialNotes: null,
			registrationType: RegistrationType.ONLINE,
			position: 3,
			estimatedWaitMinutes: 15,
			estimatedWaitMinutesAtJoin: 15,
			status: QueueStatus.WAITING,
			ringCount: 0,
			lastRingedAt: null,
			fid: null,
			joinedAt: new Date('2026-11-08T10:00:00.000Z'),
			seatedAt: null,
			createdAt: new Date('2026-11-08T10:00:00.000Z'),
			updatedAt: new Date('2026-11-08T10:00:00.000Z'),
			...overrides,
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
			findActiveByPhone: jest.fn(),
			findActiveByUserId: jest.fn(),
			findActiveByUserIdAndRestaurantId: jest.fn(),
			countActiveAhead: jest.fn(),
			sumPartySizeActiveAhead: jest.fn(),
			getActiveQueueMetrics: jest.fn(),
			getRegistrationMetrics: jest.fn(),
			countToday: jest.fn(),
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

		mockRestaurantServiceClient = {
			checkAvailability: jest.fn(),
			getRestaurantStatus: jest.fn().mockResolvedValue({
				restaurantId,
				restaurantName: 'The Gourmet Kitchen',
				verificationStatus: 'VERIFIED',
				isBlocked: false,
				blockReason: null,
				isSubscriptionActive: true,
				subscriptionPlanCode: 'QUEUE_PRO',
				subscriptionEndsAt: null,
			}),
			assignTables: jest.fn(),
			releaseTables: jest.fn(),
		};

		mockQueueCacheService = {
			saveLiveEntry: jest.fn(),
			getLiveEntry: jest.fn().mockResolvedValue(null),
			removeLiveEntry: jest.fn(),
		};

		mockLogger = {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
		};

		useCase = new GetCustomerQueueStatusSnapshotUseCase(
			mockQueueRepository,
			mockRestaurantServiceClient,
			mockQueueCacheService,
			mockLogger,
		);
	});

	it('should throw QueueEntryNotFoundError when snapshot is not found in repository', async () => {
		mockQueueRepository.getCustomerQueueEntrySnapshot.mockResolvedValueOnce(null);

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				userId,
			}),
		).rejects.toThrow(QueueEntryNotFoundError);

		expect(mockQueueRepository.getCustomerQueueEntrySnapshot).toHaveBeenCalledWith(
			restaurantId,
			queueEntryId,
		);
	});

	it('should throw WalkInTicketNotAccessibleError when entry has WALK_IN registration type', async () => {
		const entry = createMockQueueEntry({
			registrationType: RegistrationType.WALK_IN,
			userId: null,
		});
		mockQueueRepository.getCustomerQueueEntrySnapshot.mockResolvedValueOnce({
			entry,
			position: 1,
			totalWaitingParties: 2,
			assignedTableId: null,
		});

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				userId,
			}),
		).rejects.toThrow(WalkInTicketNotAccessibleError);
	});

	it('should throw ForbiddenTicketAccessError when entry does not belong to requesting customer', async () => {
		const entry = createMockQueueEntry({
			userId: 'different-customer-uuid',
		});
		mockQueueRepository.getCustomerQueueEntrySnapshot.mockResolvedValueOnce({
			entry,
			position: 2,
			totalWaitingParties: 5,
			assignedTableId: null,
		});

		await expect(
			useCase.execute({
				restaurantId,
				queueEntryId,
				userId,
			}),
		).rejects.toThrow(ForbiddenTicketAccessError);
	});

	it('should successfully return status snapshot for waiting queue entry', async () => {
		const entry = createMockQueueEntry();
		mockQueueRepository.getCustomerQueueEntrySnapshot.mockResolvedValueOnce({
			entry,
			position: 3,
			totalWaitingParties: 7,
			assignedTableId: null,
		});

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			userId,
		});

		expect(result).toEqual({
			queueEntryId,
			restaurantId,
			restaurantName: 'The Gourmet Kitchen',
			queueNumber: 'Q-001',
			guestName: 'Jane Doe',
			partySize: 2,
			position: 3,
			totalWaitingParties: 7,
			estimatedWaitMinutes: 15,
			status: QueueStatus.WAITING,
			registrationType: RegistrationType.ONLINE,
			joinedAt: '2026-11-08T10:00:00.000Z',
			updatedAt: '2026-11-08T10:00:00.000Z',
			lastRingAt: null,
			responseDeadline: null,
			assignedTableId: null,
		});

		expect(mockQueueCacheService.getLiveEntry).toHaveBeenCalledWith(queueEntryId);
	});

	it('should use live position and eta from redis cache when available', async () => {
		const entry = createMockQueueEntry();
		mockQueueRepository.getCustomerQueueEntrySnapshot.mockResolvedValueOnce({
			entry,
			position: 5,
			totalWaitingParties: 7,
			assignedTableId: null,
		});
		mockQueueCacheService.getLiveEntry.mockResolvedValueOnce({
			queueEntryId,
			restaurantId,
			position: 2,
			currentEta: 10,
			updatedAt: new Date().toISOString(),
		});

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			userId,
		});

		expect(result.position).toBe(2);
		expect(result.estimatedWaitMinutes).toBe(10);
	});

	it('should handle non-waiting entry: null position and estimated wait without querying live entry cache', async () => {
		const entry = createMockQueueEntry({
			status: QueueStatus.SEATED,
			seatedAt: new Date('2026-11-08T10:30:00.000Z'),
		});
		mockQueueRepository.getCustomerQueueEntrySnapshot.mockResolvedValueOnce({
			entry,
			position: null,
			totalWaitingParties: 4,
			assignedTableId: 'table-uuid-1',
		});

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			userId,
		});

		expect(result.position).toBeNull();
		expect(result.estimatedWaitMinutes).toBeNull();
		expect(result.status).toBe(QueueStatus.SEATED);
		expect(result.assignedTableId).toBe('table-uuid-1');
		expect(mockQueueCacheService.getLiveEntry).not.toHaveBeenCalled();
	});

	it('should return responseDeadline when entry was rung', async () => {
		const ringTime = new Date('2026-11-08T10:20:00.000Z');
		const expectedDeadline = new Date(ringTime.getTime() + 120_000).toISOString();

		const entry = createMockQueueEntry({
			status: QueueStatus.WAITING,
			ringCount: 1,
			lastRingedAt: ringTime,
		});

		mockQueueRepository.getCustomerQueueEntrySnapshot.mockResolvedValueOnce({
			entry,
			position: 1,
			totalWaitingParties: 3,
			assignedTableId: 'table-uuid-2',
		});

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			userId,
		});

		expect(result.lastRingAt).toBe(ringTime.toISOString());
		expect(result.responseDeadline).toBe(expectedDeadline);
		expect(result.assignedTableId).toBe('table-uuid-2');
	});

	it('should gracefully fallback to empty restaurantName when restaurant service fails', async () => {
		mockRestaurantServiceClient.getRestaurantStatus.mockRejectedValueOnce(
			new Error('Service unavailable'),
		);

		const entry = createMockQueueEntry();
		mockQueueRepository.getCustomerQueueEntrySnapshot.mockResolvedValueOnce({
			entry,
			position: 1,
			totalWaitingParties: 1,
			assignedTableId: null,
		});

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			userId,
		});

		expect(result.restaurantName).toBe('');
		expect(result.queueEntryId).toBe(queueEntryId);
	});

	it('should not throw if redis read fails for waiting entry', async () => {
		mockQueueCacheService.getLiveEntry.mockRejectedValueOnce(new Error('Redis connection lost'));

		const entry = createMockQueueEntry();
		mockQueueRepository.getCustomerQueueEntrySnapshot.mockResolvedValueOnce({
			entry,
			position: 1,
			totalWaitingParties: 1,
			assignedTableId: null,
		});

		const result = await useCase.execute({
			restaurantId,
			queueEntryId,
			userId,
		});

		expect(result.position).toBe(1);
	});
});
