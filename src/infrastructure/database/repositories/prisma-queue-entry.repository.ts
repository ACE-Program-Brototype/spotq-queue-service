import type {
	AssignTablesParams,
	CreateQueueEntryParams,
	IQueueEntryRepository,
	QueueEntryWithDetails,
	UpdateQueueStatusParams,
} from '@domain/repositories/queue-entry.repository.interface.ts';
import type { PrismaClient, QueueEntry, QueueStatus, TableAssignment } from '@prisma/client';

export class PrismaQueueEntryRepository implements IQueueEntryRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async create(data: CreateQueueEntryParams): Promise<QueueEntryWithDetails> {
		return this.prisma.$transaction(async (tx) => {
			const queueEntry = await tx.queueEntry.create({
				data: {
					restaurantId: data.restaurantId,
					userId: data.userId ?? null,
					guestName: data.guestName,
					phone: data.phone,
					queueNumber: data.queueNumber,
					partySize: data.partySize,
					registrationType: data.registrationType,
					position: data.position ?? null,
					estimatedWaitMinutes: data.estimatedWaitMinutes ?? null,
					estimatedWaitMinutesAtJoin:
						data.estimatedWaitMinutesAtJoin ?? data.estimatedWaitMinutes ?? null,
					status: 'WAITING',
					ringCount: 0,
				},
			});

			await tx.queueStatusHistory.create({
				data: {
					queueEntryId: queueEntry.id,
					previousStatus: null,
					currentStatus: 'WAITING',
					changedBy: data.changedBy ?? null,
				},
			});

			const result = await tx.queueEntry.findUniqueOrThrow({
				where: { id: queueEntry.id },
				include: {
					tableAssignments: true,
					statusHistory: {
						orderBy: { changedAt: 'asc' },
					},
				},
			});

			return result;
		});
	}

	async findById(id: string): Promise<QueueEntryWithDetails | null> {
		return this.prisma.queueEntry.findUnique({
			where: { id },
			include: {
				tableAssignments: true,
				statusHistory: {
					orderBy: { changedAt: 'asc' },
				},
			},
		});
	}

	async findByRestaurantAndStatus(
		restaurantId: string,
		status?: QueueStatus,
	): Promise<QueueEntryWithDetails[]> {
		return this.prisma.queueEntry.findMany({
			where: {
				restaurantId,
				...(status ? { status } : {}),
			},
			orderBy: { joinedAt: 'asc' },
			include: {
				tableAssignments: true,
				statusHistory: {
					orderBy: { changedAt: 'asc' },
				},
			},
		});
	}

	async findByUser(userId: string, status?: QueueStatus): Promise<QueueEntryWithDetails[]> {
		return this.prisma.queueEntry.findMany({
			where: {
				userId,
				...(status ? { status } : {}),
			},
			orderBy: { joinedAt: 'desc' },
			include: {
				tableAssignments: true,
				statusHistory: {
					orderBy: { changedAt: 'asc' },
				},
			},
		});
	}

	async updateStatus(params: UpdateQueueStatusParams): Promise<QueueEntryWithDetails> {
		return this.prisma.$transaction(async (tx) => {
			const current = await tx.queueEntry.findUniqueOrThrow({
				where: { id: params.id },
				select: { status: true, ringCount: true },
			});

			const updateData: {
				status: QueueStatus;
				seatedAt?: Date | null;
				ringCount?: { increment: number };
			} = {
				status: params.status,
			};

			if (params.seatedAt !== undefined) {
				updateData.seatedAt = params.seatedAt;
			}
			if (params.incrementRingCount) {
				updateData.ringCount = { increment: 1 };
			}

			await tx.queueEntry.update({
				where: { id: params.id },
				data: updateData,
			});

			await tx.queueStatusHistory.create({
				data: {
					queueEntryId: params.id,
					previousStatus: current.status,
					currentStatus: params.status,
					changedBy: params.changedBy ?? null,
				},
			});

			return tx.queueEntry.findUniqueOrThrow({
				where: { id: params.id },
				include: {
					tableAssignments: true,
					statusHistory: {
						orderBy: { changedAt: 'asc' },
					},
				},
			});
		});
	}

	async assignTables(params: AssignTablesParams): Promise<TableAssignment[]> {
		return this.prisma.$transaction(async (tx) => {
			const assignments: TableAssignment[] = [];
			for (const table of params.tables) {
				const assignment = await tx.tableAssignment.create({
					data: {
						queueEntryId: params.queueEntryId,
						tableId: table.tableId,
						assignedBy: table.assignedBy,
					},
				});
				assignments.push(assignment);
			}
			return assignments;
		});
	}

	async releaseTable(assignmentId: string): Promise<TableAssignment> {
		return this.prisma.tableAssignment.update({
			where: { id: assignmentId },
			data: {
				releasedAt: new Date(),
			},
		});
	}

	async updatePositionAndEta(
		id: string,
		position: number | null,
		estimatedWaitMinutes: number | null,
	): Promise<QueueEntry> {
		return this.prisma.queueEntry.update({
			where: { id },
			data: {
				position,
				estimatedWaitMinutes,
			},
		});
	}
}
