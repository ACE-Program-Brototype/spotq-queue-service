import type { QueueEntry } from '../entities/queue-entry.entity.ts';
import type { QueueStatus } from '../enums/queue.enums.ts';
import type { IBaseRepository } from './base.repository.interface.ts';

export interface ActiveQueueMetrics {
	queueDepth: number;
	totalPeopleAhead: number;
}

export interface StaffQueueQueryFilters {
	status?: QueueStatus;
	minPartySize?: number;
	maxPartySize?: number;
}

export interface StaffQueueSnapshotItem {
	entry: QueueEntry;
	assignedTableId: string | null;
}

export interface StaffQueueSnapshotResult {
	totalWaiting: number;
	entries: StaffQueueSnapshotItem[];
}

export interface IQueueRepository extends IBaseRepository<QueueEntry, string> {
	findActiveEntries(restaurantId: string): Promise<QueueEntry[]>;
	countActiveAhead(restaurantId: string): Promise<number>;
	sumPartySizeActiveAhead(restaurantId: string): Promise<number>;
	getActiveQueueMetrics(
		restaurantId: string,
	): Promise<{ queueDepth: number; totalPeopleAhead: number }>;
	countToday(restaurantId: string): Promise<number>;
	findActiveByPhone(restaurantId: string, phone: string): Promise<QueueEntry | null>;
	findActiveByUserId(restaurantId: string, userId: string): Promise<QueueEntry | null>;
	createWithHistory(queueEntry: QueueEntry, changedBy?: string): Promise<QueueEntry>;
	assignTablesWithHistory(
		queueEntry: QueueEntry,
		tableIds: string[],
		assignedBy: string,
		previousStatus: QueueStatus,
	): Promise<QueueEntry>;
	getStaffQueueSnapshot(
		restaurantId: string,
		filters: StaffQueueQueryFilters,
	): Promise<StaffQueueSnapshotResult>;
}
