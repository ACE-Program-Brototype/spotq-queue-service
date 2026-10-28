import { TYPES } from '@di/types.ts';
import { type IQueueRepository, type QueueEntry, QueueStatus } from '@domain/index.ts';
import type { Prisma, PrismaClient, QueueEntry as PrismaQueueEntry } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { QueueEntryMapper } from '../mappers/queue-entry.mapper.ts';
import { PrismaBaseRepository } from './prisma-base.repository.ts';

/**
 * Concrete Prisma implementation of IQueueRepository.
 *
 * Extends the generic PrismaBaseRepository to inherit standard CRUD operations,
 * and adds queue-specific queries (depth calculation, active party checks, and atomic transaction history).
 */
@injectable()
export class PrismaQueueRepository
	extends PrismaBaseRepository<QueueEntry, PrismaQueueEntry, Prisma.QueueEntryDelegate>
	implements IQueueRepository
{
	constructor(
		@inject(TYPES.Database.PrismaClient)
		private readonly prismaClient: PrismaClient,
	) {
		super(prismaClient.queueEntry as unknown as Prisma.QueueEntryDelegate, QueueEntryMapper);
	}

	/**
	 * Returns all currently active queue entries (WAITING or RINGING) for a restaurant,
	 * sorted chronologically by joinedAt timestamp.
	 *
	 * @param restaurantId - Restaurant UUID
	 * @returns Array of active QueueEntry domain entities
	 */
	public async findActiveEntries(restaurantId: string): Promise<QueueEntry[]> {
		return this.run(async () => {
			const records = await this.prismaClient.queueEntry.findMany({
				where: {
					restaurantId,
					status: QueueStatus.WAITING,
				},
				orderBy: {
					joinedAt: 'asc',
				},
			});
			return records.map((r: PrismaQueueEntry) => this.mapper.toDomain(r));
		});
	}

	/**
	 * Counts active entries ahead in queue for position calculation.
	 *
	 * @param restaurantId - Restaurant UUID
	 * @returns Number of parties waiting ahead
	 */
	public async countActiveAhead(restaurantId: string): Promise<number> {
		return this.run(async () => {
			return this.prismaClient.queueEntry.count({
				where: {
					restaurantId,
					status: QueueStatus.WAITING,
				},
			});
		});
	}

	/**
	 * Calculates the sum of party sizes for all active parties ahead in the queue.
	 * Used as the primary volume input for the ML wait-time estimation model.
	 *
	 * @param restaurantId - Restaurant UUID
	 * @returns Cumulative number of persons waiting ahead
	 */
	public async sumPartySizeActiveAhead(restaurantId: string): Promise<number> {
		return this.run(async () => {
			const aggregate = await this.prismaClient.queueEntry.aggregate({
				where: {
					restaurantId,
					status: QueueStatus.WAITING,
				},
				_sum: {
					partySize: true,
				},
			});
			return aggregate._sum.partySize ?? 0;
		});
	}

	/**
	 * Computes active queue metrics (depth and cumulative people waiting)
	 * for a restaurant in a single database round-trip via Prisma aggregate.
	 *
	 * @param restaurantId - Restaurant UUID
	 * @returns Aggregated queue depth and total people ahead
	 */
	public async getActiveQueueMetrics(
		restaurantId: string,
	): Promise<{ queueDepth: number; totalPeopleAhead: number }> {
		return this.run(async () => {
			const aggregate = await this.prismaClient.queueEntry.aggregate({
				where: {
					restaurantId,
					status: QueueStatus.WAITING,
				},
				_count: {
					_all: true,
				},
				_sum: {
					partySize: true,
				},
			});

			return {
				queueDepth: aggregate._count._all,
				totalPeopleAhead: aggregate._sum.partySize ?? 0,
			};
		});
	}

	/**
	 * Counts total queue entries registered today for generating daily sequential queue numbers (e.g. W-001).
	 *
	 * @param restaurantId - Restaurant UUID
	 * @returns Count of entries created since start of today (local midnight)
	 */
	public async countToday(restaurantId: string): Promise<number> {
		const startOfDay = new Date();
		startOfDay.setHours(0, 0, 0, 0);

		return this.run(async () => {
			return this.prismaClient.queueEntry.count({
				where: {
					restaurantId,
					createdAt: {
						gte: startOfDay,
					},
				},
			});
		});
	}

	/**
	 * Queries whether a guest with the specified phone number currently has an active ticket.
	 *
	 * @param restaurantId - Restaurant UUID
	 * @param phone - Guest phone number in E.164 format
	 * @returns Active QueueEntry or null
	 */
	public async findActiveByPhone(restaurantId: string, phone: string): Promise<QueueEntry | null> {
		return this.run(async () => {
			const record = await this.prismaClient.queueEntry.findFirst({
				where: {
					restaurantId,
					phone,
					status: QueueStatus.WAITING,
				},
			});
			return record ? this.mapper.toDomain(record) : null;
		});
	}

	/**
	 * Queries whether a registered user currently has an active ticket by userId And RestaurantId.
	 *
	 * @param restaurantId - Restaurant UUID
	 * @param userId - User UUID
	 * @returns Active QueueEntry or null
	 */
	public async findActiveByUserIdAndRestaurantId(
		restaurantId: string,
		userId: string,
	): Promise<QueueEntry | null> {
		return this.run(async () => {
			const record = await this.prismaClient.queueEntry.findFirst({
				where: {
					restaurantId,
					userId,
					status: QueueStatus.WAITING,
				},
				orderBy: {
					joinedAt: 'desc',
				},
			});
			return record ? this.mapper.toDomain(record) : null;
		});
	}

	/**
	 * Queries where a registered user currently have a active ticket.
	 *
	 * @param userId User UUID
	 * @returns Active Queue Entry or null
	 */
	public async findActiveByUserId(userId: string): Promise<QueueEntry | null> {
		return this.findOne({ where: { userId, status: QueueStatus.WAITING } });
	}

	/**
	 * Atomically creates a queue entry and an initial queue status audit history entry
	 * within a single database transaction.
	 *
	 * @param queueEntry - Domain entity to persist
	 * @param changedBy - ID of staff member initiating the action
	 * @returns Newly persisted QueueEntry domain entity
	 */
	public async createWithHistory(queueEntry: QueueEntry, changedBy?: string): Promise<QueueEntry> {
		return this.run(async () => {
			const persistenceData = this.mapper.toPersistence(queueEntry);

			const createdRecord = await this.prismaClient.$transaction(async (tx) => {
				const client = tx as Prisma.TransactionClient;
				const created = await client.queueEntry.create({
					data: persistenceData,
				});

				await client.queueStatusHistory.create({
					data: {
						queueEntryId: created.id,
						previousStatus: null,
						currentStatus: created.status,
						changedBy: changedBy ?? null,
					},
				});

				return created;
			});

			return this.mapper.toDomain(createdRecord);
		});
	}

	public async assignTablesWithHistory(
		queueEntry: QueueEntry,
		tableIds: string[],
		assignedBy: string,
		previousStatus: QueueStatus,
	): Promise<QueueEntry> {
		return this.run(async () => {
			const persistenceData = this.mapper.toPersistence(queueEntry);

			const updatedRecord = await this.prismaClient.$transaction(async (tx) => {
				const client = tx as Prisma.TransactionClient;

				await client.tableAssignment.createMany({
					data: tableIds.map((tableId) => ({
						queueEntryId: queueEntry.id,
						tableId,
						assignedBy,
						assignedAt: queueEntry.seatedAt ?? new Date(),
					})),
				});

				const updated = await client.queueEntry.update({
					where: { id: queueEntry.id },
					data: persistenceData,
				});

				await client.queueStatusHistory.create({
					data: {
						queueEntryId: queueEntry.id,
						previousStatus,
						currentStatus: queueEntry.status,
						changedBy: assignedBy,
					},
				});

				return updated;
			});

			return this.mapper.toDomain(updatedRecord);
		});
	}
}
