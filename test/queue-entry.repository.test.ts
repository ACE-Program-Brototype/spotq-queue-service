import { PrismaQueueEntryRepository } from '@infrastructure/database/repositories/prisma-queue-entry.repository.ts';
import type { PrismaClient, QueueStatus, TableAssignment } from '@prisma/client';

type MockPrisma = {
	$transaction: jest.Mock;
	queueEntry: {
		create: jest.Mock;
		findUnique: jest.Mock;
		findUniqueOrThrow: jest.Mock;
		findMany: jest.Mock;
		update: jest.Mock;
	};
	queueStatusHistory: {
		create: jest.Mock;
	};
	tableAssignment: {
		create: jest.Mock;
		update: jest.Mock;
	};
};

describe('PrismaQueueEntryRepository Unit Tests', () => {
	let mockPrisma: MockPrisma;
	let repository: PrismaQueueEntryRepository;

	beforeEach(() => {
		mockPrisma = {
			$transaction: jest.fn(async (callback: (tx: MockPrisma) => Promise<unknown>) =>
				callback(mockPrisma),
			),
			queueEntry: {
				create: jest.fn(),
				findUnique: jest.fn(),
				findUniqueOrThrow: jest.fn(),
				findMany: jest.fn(),
				update: jest.fn(),
			},
			queueStatusHistory: {
				create: jest.fn(),
			},
			tableAssignment: {
				create: jest.fn(),
				update: jest.fn(),
			},
		};

		repository = new PrismaQueueEntryRepository(mockPrisma as unknown as PrismaClient);
	});

	describe('create (Registration: Walk-in and Online)', () => {
		it('should create a walk-in queue entry with initial WAITING status and status history', async () => {
			const mockCreatedEntry = {
				id: 'entry-uuid-1',
				restaurantId: 'rest-uuid-1',
				userId: null,
				guestName: 'John Doe',
				phone: '+1234567890',
				queueNumber: 'A-001',
				partySize: 4,
				registrationType: 'WALK_IN',
				position: 1,
				estimatedWaitMinutes: 20,
				estimatedWaitMinutesAtJoin: 20,
				status: 'WAITING',
				ringCount: 0,
				lastRingAt: null,
				responseDeadline: null,
				joinedAt: new Date(),
				seatedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const mockFullEntry = {
				...mockCreatedEntry,
				tableAssignments: [],
				statusHistory: [
					{
						id: 'hist-uuid-1',
						queueEntryId: 'entry-uuid-1',
						previousStatus: null,
						currentStatus: 'WAITING',
						changedBy: 'staff-123',
						changedAt: new Date(),
					},
				],
			};

			mockPrisma.queueEntry.create.mockResolvedValue(mockCreatedEntry);
			mockPrisma.queueStatusHistory.create.mockResolvedValue(mockFullEntry.statusHistory[0]);
			mockPrisma.queueEntry.findUniqueOrThrow.mockResolvedValue(mockFullEntry);

			const result = await repository.create({
				restaurantId: 'rest-uuid-1',
				guestName: 'John Doe',
				phone: '+1234567890',
				queueNumber: 'A-001',
				partySize: 4,
				registrationType: 'WALK_IN',
				position: 1,
				estimatedWaitMinutes: 20,
				changedBy: 'staff-123',
			});

			expect(mockPrisma.$transaction).toHaveBeenCalled();
			expect(mockPrisma.queueEntry.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					restaurantId: 'rest-uuid-1',
					userId: null,
					guestName: 'John Doe',
					phone: '+1234567890',
					queueNumber: 'A-001',
					partySize: 4,
					registrationType: 'WALK_IN',
					position: 1,
					estimatedWaitMinutes: 20,
					estimatedWaitMinutesAtJoin: 20,
					status: 'WAITING',
					ringCount: 0,
				}),
			});
			expect(mockPrisma.queueStatusHistory.create).toHaveBeenCalledWith({
				data: {
					queueEntryId: 'entry-uuid-1',
					previousStatus: null,
					currentStatus: 'WAITING',
					changedBy: 'staff-123',
				},
			});
			expect(result.id).toBe('entry-uuid-1');
			expect(result.statusHistory).toHaveLength(1);
		});

		it('should create an online queue entry with userId and explicit ML ETA telemetry snapshot', async () => {
			const mockCreatedEntry = {
				id: 'entry-uuid-2',
				restaurantId: 'rest-uuid-1',
				userId: 'user-uuid-1',
				guestName: 'Jane Smith',
				phone: '+1987654321',
				queueNumber: 'A-002',
				partySize: 2,
				registrationType: 'ONLINE',
				position: 2,
				estimatedWaitMinutes: 35,
				estimatedWaitMinutesAtJoin: 35,
				status: 'WAITING',
				ringCount: 0,
				lastRingAt: null,
				responseDeadline: null,
				joinedAt: new Date(),
				seatedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const mockFullEntry = {
				...mockCreatedEntry,
				tableAssignments: [],
				statusHistory: [],
			};

			mockPrisma.queueEntry.create.mockResolvedValue(mockCreatedEntry);
			mockPrisma.queueEntry.findUniqueOrThrow.mockResolvedValue(mockFullEntry);

			const result = await repository.create({
				restaurantId: 'rest-uuid-1',
				userId: 'user-uuid-1',
				guestName: 'Jane Smith',
				phone: '+1987654321',
				queueNumber: 'A-002',
				partySize: 2,
				registrationType: 'ONLINE',
				position: 2,
				estimatedWaitMinutes: 35,
				estimatedWaitMinutesAtJoin: 35,
			});

			expect(mockPrisma.queueEntry.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					restaurantId: 'rest-uuid-1',
					userId: 'user-uuid-1',
					registrationType: 'ONLINE',
					estimatedWaitMinutesAtJoin: 35,
				}),
			});
			expect(result.userId).toBe('user-uuid-1');
		});
	});

	describe('Lifecycle Status Transitions', () => {
		it('should transition from WAITING to RINGING and increment ringCount and set responseDeadline', async () => {
			const now = new Date();
			const deadline = new Date(now.getTime() + 10 * 60 * 1000);

			mockPrisma.queueEntry.findUniqueOrThrow
				.mockResolvedValueOnce({ status: 'WAITING', ringCount: 0 })
				.mockResolvedValueOnce({
					id: 'entry-uuid-1',
					status: 'RINGING',
					ringCount: 1,
					lastRingAt: now,
					responseDeadline: deadline,
					tableAssignments: [],
					statusHistory: [
						{ previousStatus: null, currentStatus: 'WAITING' },
						{ previousStatus: 'WAITING', currentStatus: 'RINGING' },
					],
				});

			mockPrisma.queueEntry.update.mockResolvedValue({});
			mockPrisma.queueStatusHistory.create.mockResolvedValue({});

			const result = await repository.updateStatus({
				id: 'entry-uuid-1',
				status: 'RINGING',
				lastRingAt: now,
				responseDeadline: deadline,
				incrementRingCount: true,
				changedBy: 'staff-456',
			});

			expect(mockPrisma.queueEntry.update).toHaveBeenCalledWith({
				where: { id: 'entry-uuid-1' },
				data: {
					status: 'RINGING',
					lastRingAt: now,
					responseDeadline: deadline,
					ringCount: { increment: 1 },
				},
			});
			expect(mockPrisma.queueStatusHistory.create).toHaveBeenCalledWith({
				data: {
					queueEntryId: 'entry-uuid-1',
					previousStatus: 'WAITING',
					currentStatus: 'RINGING',
					changedBy: 'staff-456',
				},
			});
			expect(result.status).toBe('RINGING');
		});

		it('should transition from RINGING to ACCEPTED', async () => {
			mockPrisma.queueEntry.findUniqueOrThrow
				.mockResolvedValueOnce({ status: 'RINGING', ringCount: 1 })
				.mockResolvedValueOnce({
					id: 'entry-uuid-1',
					status: 'ACCEPTED',
					tableAssignments: [],
					statusHistory: [],
				});

			const result = await repository.updateStatus({
				id: 'entry-uuid-1',
				status: 'ACCEPTED',
				changedBy: 'user-uuid-1',
			});

			expect(mockPrisma.queueStatusHistory.create).toHaveBeenCalledWith({
				data: {
					queueEntryId: 'entry-uuid-1',
					previousStatus: 'RINGING',
					currentStatus: 'ACCEPTED',
					changedBy: 'user-uuid-1',
				},
			});
			expect(result.status).toBe('ACCEPTED');
		});

		it('should transition to SEATED and record seatedAt timestamp', async () => {
			const seatedAt = new Date();
			mockPrisma.queueEntry.findUniqueOrThrow
				.mockResolvedValueOnce({ status: 'ACCEPTED', ringCount: 1 })
				.mockResolvedValueOnce({
					id: 'entry-uuid-1',
					status: 'SEATED',
					seatedAt,
					tableAssignments: [],
					statusHistory: [],
				});

			const result = await repository.updateStatus({
				id: 'entry-uuid-1',
				status: 'SEATED',
				seatedAt,
				changedBy: 'staff-host',
			});

			expect(mockPrisma.queueEntry.update).toHaveBeenCalledWith({
				where: { id: 'entry-uuid-1' },
				data: {
					status: 'SEATED',
					seatedAt,
				},
			});
			expect(result.status).toBe('SEATED');
		});

		it('should support SKIPPED, CANCELLED, and NO_SHOW terminal transitions', async () => {
			for (const status of ['SKIPPED', 'CANCELLED', 'NO_SHOW'] as QueueStatus[]) {
				mockPrisma.queueEntry.findUniqueOrThrow
					.mockResolvedValueOnce({ status: 'RINGING', ringCount: 2 })
					.mockResolvedValueOnce({
						id: 'entry-uuid-1',
						status,
						tableAssignments: [],
						statusHistory: [],
					});

				const result = await repository.updateStatus({
					id: 'entry-uuid-1',
					status,
					changedBy: 'system',
				});

				expect(result.status).toBe(status);
			}
		});
	});

	describe('Multi-table Assignments', () => {
		it('should assign multiple tables to a single queue entry', async () => {
			const mockAssignment1: TableAssignment = {
				id: 'assign-1',
				queueEntryId: 'entry-uuid-1',
				tableId: 'table-uuid-101',
				assignedBy: 'staff-1',
				assignedAt: new Date(),
				releasedAt: null,
			};
			const mockAssignment2: TableAssignment = {
				id: 'assign-2',
				queueEntryId: 'entry-uuid-1',
				tableId: 'table-uuid-102',
				assignedBy: 'staff-1',
				assignedAt: new Date(),
				releasedAt: null,
			};

			mockPrisma.tableAssignment.create
				.mockResolvedValueOnce(mockAssignment1)
				.mockResolvedValueOnce(mockAssignment2);

			const assignments = await repository.assignTables({
				queueEntryId: 'entry-uuid-1',
				tables: [
					{ tableId: 'table-uuid-101', assignedBy: 'staff-1' },
					{ tableId: 'table-uuid-102', assignedBy: 'staff-1' },
				],
			});

			expect(mockPrisma.$transaction).toHaveBeenCalled();
			expect(mockPrisma.tableAssignment.create).toHaveBeenCalledTimes(2);
			expect(assignments).toHaveLength(2);
			expect(assignments[0].tableId).toBe('table-uuid-101');
			expect(assignments[1].tableId).toBe('table-uuid-102');
		});

		it('should release an assigned table by updating releasedAt', async () => {
			const releasedAt = new Date();
			mockPrisma.tableAssignment.update.mockResolvedValue({
				id: 'assign-1',
				queueEntryId: 'entry-uuid-1',
				tableId: 'table-uuid-101',
				assignedBy: 'staff-1',
				assignedAt: new Date(),
				releasedAt,
			});

			const updated = await repository.releaseTable('assign-1');

			expect(mockPrisma.tableAssignment.update).toHaveBeenCalledWith({
				where: { id: 'assign-1' },
				data: {
					releasedAt: expect.any(Date),
				},
			});
			expect(updated.releasedAt).toBeDefined();
		});
	});

	describe('ML ETA Telemetry & Queue Position Updates', () => {
		it('should update position and ETA while preserving original estimatedWaitMinutesAtJoin', async () => {
			mockPrisma.queueEntry.update.mockResolvedValue({
				id: 'entry-uuid-1',
				position: 3,
				estimatedWaitMinutes: 15,
				estimatedWaitMinutesAtJoin: 45,
			});

			const updated = await repository.updatePositionAndEta('entry-uuid-1', 3, 15);

			expect(mockPrisma.queueEntry.update).toHaveBeenCalledWith({
				where: { id: 'entry-uuid-1' },
				data: {
					position: 3,
					estimatedWaitMinutes: 15,
				},
			});
			expect(updated.position).toBe(3);
			expect(updated.estimatedWaitMinutes).toBe(15);
		});
	});

	describe('Queries & Index Filters', () => {
		it('should find queue entry by ID with details', async () => {
			const mockData = {
				id: 'entry-uuid-1',
				guestName: 'John',
				tableAssignments: [],
				statusHistory: [],
			};
			mockPrisma.queueEntry.findUnique.mockResolvedValue(mockData);

			const result = await repository.findById('entry-uuid-1');

			expect(mockPrisma.queueEntry.findUnique).toHaveBeenCalledWith({
				where: { id: 'entry-uuid-1' },
				include: {
					tableAssignments: true,
					statusHistory: { orderBy: { changedAt: 'asc' } },
				},
			});
			expect(result).toEqual(mockData);
		});

		it('should query queue entries by restaurantId and status', async () => {
			mockPrisma.queueEntry.findMany.mockResolvedValue([]);

			await repository.findByRestaurantAndStatus('rest-uuid-1', 'WAITING');

			expect(mockPrisma.queueEntry.findMany).toHaveBeenCalledWith({
				where: {
					restaurantId: 'rest-uuid-1',
					status: 'WAITING',
				},
				orderBy: { joinedAt: 'asc' },
				include: {
					tableAssignments: true,
					statusHistory: { orderBy: { changedAt: 'asc' } },
				},
			});
		});

		it('should query queue entries by userId and status', async () => {
			mockPrisma.queueEntry.findMany.mockResolvedValue([]);

			await repository.findByUser('user-uuid-1', 'WAITING');

			expect(mockPrisma.queueEntry.findMany).toHaveBeenCalledWith({
				where: {
					userId: 'user-uuid-1',
					status: 'WAITING',
				},
				orderBy: { joinedAt: 'desc' },
				include: {
					tableAssignments: true,
					statusHistory: { orderBy: { changedAt: 'asc' } },
				},
			});
		});
	});
});
