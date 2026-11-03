import type { QueueEntry } from '../entities/queue-entry.entity.ts';
import type { QueueStatus } from '../enums/queue.enums.ts';
import type { IBaseRepository } from './i-base.repository.ts';

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

export interface UpdateStatusWithHistoryParams {
	queueEntry: QueueEntry;
	previousStatus: QueueStatus;
	changedBy: string;
	reason?: string | null;
	notes?: string | null;
}

export interface ActiveTableAssignmentResult {
	id: string;
	queueEntryId: string;
	tableId: string;
	assignedBy: string;
	assignedAt: Date;
	releasedAt: Date | null;
}

export interface IQueueRepository extends IBaseRepository<QueueEntry, string> {
	findActiveByUserId(userId: string): Promise<QueueEntry | null>;
	findActiveEntries(restaurantId: string): Promise<QueueEntry[]>;
	countActiveAhead(restaurantId: string): Promise<number>;
	sumPartySizeActiveAhead(restaurantId: string): Promise<number>;
	getActiveQueueMetrics(
		restaurantId: string,
	): Promise<{ queueDepth: number; totalPeopleAhead: number }>;
	getRegistrationMetrics(
		restaurantId: string,
	): Promise<{ queueDepth: number; totalPeopleAhead: number; countToday: number }>;
	countToday(restaurantId: string): Promise<number>;
	findActiveByPhone(restaurantId: string, phone: string): Promise<QueueEntry | null>;
	findActiveByUserIdAndRestaurantId(
		restaurantId: string,
		userId: string,
	): Promise<QueueEntry | null>;
	createWithHistory(queueEntry: QueueEntry, changedBy?: string): Promise<QueueEntry>;
	assignTablesWithHistory(
		queueEntry: QueueEntry,
		tableIds: string[],
		assignedBy: string,
		previousStatus: QueueStatus,
	): Promise<QueueEntry>;
	updateStatusWithHistory(params: UpdateStatusWithHistoryParams): Promise<QueueEntry>;
	findActiveTableAssignments(queueEntryId: string): Promise<ActiveTableAssignmentResult[]>;
	releaseTableAssignments(queueEntryId: string): Promise<void>;
	batchUpdatePositions(
		updates: Array<{ id: string; position: number | null; estimatedWaitMinutes?: number | null }>,
	): Promise<void>;
	getStaffQueueSnapshot(
		restaurantId: string,
		filters: StaffQueueQueryFilters,
	): Promise<StaffQueueSnapshotResult>;
}
