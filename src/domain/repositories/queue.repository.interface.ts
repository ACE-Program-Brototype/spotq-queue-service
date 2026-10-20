import type { QueueEntry } from '../entities/queue-entry.entity.ts';
import type { IBaseRepository } from './base.repository.interface.ts';

export interface IQueueRepository extends IBaseRepository<QueueEntry, string> {
	findActiveEntries(restaurantId: string): Promise<QueueEntry[]>;
	countActiveAhead(restaurantId: string): Promise<number>;
	sumPartySizeActiveAhead(restaurantId: string): Promise<number>;
	countToday(restaurantId: string): Promise<number>;
	findActiveByPhone(restaurantId: string, phone: string): Promise<QueueEntry | null>;
	findActiveByUserId(restaurantId: string, userId: string): Promise<QueueEntry | null>;
	createWithHistory(queueEntry: QueueEntry, changedBy?: string): Promise<QueueEntry>;
}
