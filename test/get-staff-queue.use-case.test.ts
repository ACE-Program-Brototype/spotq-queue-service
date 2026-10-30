import { GetStaffQueueUseCase } from '@application/use-cases/get-staff-queue.use-case.ts';
import { QueueEntry, QueueStatus, RegistrationType } from '@domain/index.ts';
import type { IQueueRepository } from '@domain/repositories/queue.repository.interface.ts';

describe('GetStaffQueueUseCase Unit Tests', () => {
	let useCase: GetStaffQueueUseCase;
	let mockQueueRepository: jest.Mocked<IQueueRepository>;

	const restaurantId = '11111111-1111-1111-1111-111111111111';

	const createMockQueueEntry = (
		overrides: Partial<Parameters<typeof QueueEntry.reconstitute>[0]> = {},
	): QueueEntry => {
		const now = new Date();
		return QueueEntry.reconstitute({
			id: overrides.id ?? 'entry-1',
			restaurantId: overrides.restaurantId ?? restaurantId,
			userId: overrides.userId ?? null,
			guestName: overrides.guestName ?? 'John Doe',
			phone: overrides.phone ?? '+15551234567',
			queueNumber: overrides.queueNumber ?? 'Q-001',
			partySize: overrides.partySize ?? 2,
			specialNotes: overrides.specialNotes ?? null,
			registrationType: overrides.registrationType ?? RegistrationType.ONLINE,
			position: overrides.position ?? 1,
			estimatedWaitMinutes: overrides.estimatedWaitMinutes ?? 10,
			estimatedWaitMinutesAtJoin: overrides.estimatedWaitMinutesAtJoin ?? 10,
			status: overrides.status ?? QueueStatus.WAITING,
			ringCount: overrides.ringCount ?? 0,
			lastRingedAt: overrides.lastRingedAt ?? null,
			fid: overrides.fid ?? null,
			joinedAt: overrides.joinedAt ?? new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
			seatedAt: overrides.seatedAt ?? null,
			createdAt: overrides.createdAt ?? now,
			updatedAt: overrides.updatedAt ?? now,
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
			countToday: jest.fn(),
			findActiveByPhone: jest.fn(),
			findActiveByUserId: jest.fn(),
			findActiveByUserIdAndRestaurantId: jest.fn(),
			getRegistrationMetrics: jest.fn(),
			createWithHistory: jest.fn(),
			assignTablesWithHistory: jest.fn(),
			getStaffQueueSnapshot: jest.fn(),
		};

		useCase = new GetStaffQueueUseCase(mockQueueRepository);
	});

	it('should default to WAITING status filter and calculate 1-based positions for un-rung parties', async () => {
		const entry1 = createMockQueueEntry({ id: 'entry-1', ringCount: 0, lastRingedAt: null });
		const entry2 = createMockQueueEntry({ id: 'entry-2', ringCount: 0, lastRingedAt: null });

		mockQueueRepository.getStaffQueueSnapshot.mockResolvedValue({
			totalWaiting: 2,
			entries: [
				{ entry: entry1, assignedTableId: null },
				{ entry: entry2, assignedTableId: null },
			],
		});

		const result = await useCase.execute({ restaurantId });

		expect(mockQueueRepository.getStaffQueueSnapshot).toHaveBeenCalledWith(restaurantId, {
			status: QueueStatus.WAITING,
			minPartySize: undefined,
			maxPartySize: undefined,
		});

		expect(result.restaurantId).toBe(restaurantId);
		expect(result.totalWaiting).toBe(2);
		expect(result.entries).toHaveLength(2);
		expect(result.entries[0].position).toBe(1);
		expect(result.entries[1].position).toBe(2);
		expect(result.entries[0].guestPhone).toBe('+15551234567');
		expect(result.entries[0].waitDurationMinutes).toBeGreaterThanOrEqual(10);
	});

	it('should assign sequential positions to waiting entries (including ringing) and compute responseDeadline', async () => {
		const ringTime = new Date('2026-10-28T10:00:00.000Z');
		const entryRinging = createMockQueueEntry({
			id: 'entry-ringing',
			ringCount: 1,
			lastRingedAt: ringTime,
			status: QueueStatus.WAITING,
		});
		const entryWaiting = createMockQueueEntry({
			id: 'entry-waiting',
			ringCount: 0,
			lastRingedAt: null,
			status: QueueStatus.WAITING,
		});

		mockQueueRepository.getStaffQueueSnapshot.mockResolvedValue({
			totalWaiting: 2,
			entries: [
				{ entry: entryRinging, assignedTableId: 'tbl-101' },
				{ entry: entryWaiting, assignedTableId: null },
			],
		});

		const result = await useCase.execute({ restaurantId });

		// Ringing party is first in line (position 1)
		expect(result.entries[0].position).toBe(1);
		expect(result.entries[0].ringCount).toBe(1);
		expect(result.entries[0].lastRingAt).toBe('2026-10-28T10:00:00.000Z');
		expect(result.entries[0].responseDeadline).toBe('2026-10-28T10:02:00.000Z');
		expect(result.entries[0].assignedTableId).toBe('tbl-101');

		// The next waiting party gets position 2
		expect(result.entries[1].position).toBe(2);
		expect(result.entries[1].lastRingAt).toBeNull();
		expect(result.entries[1].responseDeadline).toBeNull();
	});

	it('should map party size bucket small to range 1-2', async () => {
		mockQueueRepository.getStaffQueueSnapshot.mockResolvedValue({
			totalWaiting: 0,
			entries: [],
		});

		await useCase.execute({ restaurantId, partySizeBucket: 'small' });

		expect(mockQueueRepository.getStaffQueueSnapshot).toHaveBeenCalledWith(restaurantId, {
			status: QueueStatus.WAITING,
			minPartySize: 1,
			maxPartySize: 2,
		});
	});

	it('should map party size bucket medium to range 3-4', async () => {
		mockQueueRepository.getStaffQueueSnapshot.mockResolvedValue({
			totalWaiting: 0,
			entries: [],
		});

		await useCase.execute({ restaurantId, partySizeBucket: 'medium' });

		expect(mockQueueRepository.getStaffQueueSnapshot).toHaveBeenCalledWith(restaurantId, {
			status: QueueStatus.WAITING,
			minPartySize: 3,
			maxPartySize: 4,
		});
	});

	it('should map party size bucket large to minPartySize 5', async () => {
		mockQueueRepository.getStaffQueueSnapshot.mockResolvedValue({
			totalWaiting: 0,
			entries: [],
		});

		await useCase.execute({ restaurantId, partySizeBucket: 'large' });

		expect(mockQueueRepository.getStaffQueueSnapshot).toHaveBeenCalledWith(restaurantId, {
			status: QueueStatus.WAITING,
			minPartySize: 5,
			maxPartySize: undefined,
		});
	});

	it('should pass custom status and compute waitDurationMinutes from seatedAt when SEATED', async () => {
		const joinedAt = new Date('2026-10-28T10:00:00.000Z');
		const seatedAt = new Date('2026-10-28T10:25:00.000Z');
		const seatedEntry = createMockQueueEntry({
			id: 'entry-seated',
			status: QueueStatus.SEATED,
			joinedAt,
			seatedAt,
		});

		mockQueueRepository.getStaffQueueSnapshot.mockResolvedValue({
			totalWaiting: 0,
			entries: [{ entry: seatedEntry, assignedTableId: 'tbl-202' }],
		});

		const result = await useCase.execute({
			restaurantId,
			status: QueueStatus.SEATED,
		});

		expect(mockQueueRepository.getStaffQueueSnapshot).toHaveBeenCalledWith(restaurantId, {
			status: QueueStatus.SEATED,
			minPartySize: undefined,
			maxPartySize: undefined,
		});

		expect(result.entries[0].status).toBe(QueueStatus.SEATED);
		expect(result.entries[0].position).toBeNull();
		expect(result.entries[0].waitDurationMinutes).toBe(25);
		expect(result.entries[0].assignedTableId).toBe('tbl-202');
	});
});
