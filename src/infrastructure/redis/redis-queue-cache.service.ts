import type {
	IQueueCacheService,
	LiveQueueEntryState,
} from '@application/ports/cache/queue-cache.port.ts';
import { TYPES } from '@di/types.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { inject, injectable } from 'inversify';
import type Redis from 'ioredis';

@injectable()
export class RedisQueueCacheService implements IQueueCacheService {
	private static readonly KEY_PREFIX = 'queue:live:';
	private static readonly TTL_SECONDS = 86400; // 24 hours

	constructor(
		@inject(TYPES.Redis.Client)
		private readonly client: Redis,
	) {}

	private getKey(queueEntryId: string): string {
		return `${RedisQueueCacheService.KEY_PREFIX}${queueEntryId}`;
	}

	async saveLiveEntry(
		queueEntryId: string,
		restaurantId: string,
		position: number,
		currentEta: number,
	): Promise<void> {
		try {
			const key = this.getKey(queueEntryId);
			const state: LiveQueueEntryState = {
				queueEntryId,
				restaurantId,
				position,
				currentEta,
				updatedAt: new Date().toISOString(),
			};

			await this.client.set(key, JSON.stringify(state), 'EX', RedisQueueCacheService.TTL_SECONDS);

			logger.debug({ queueEntryId, position, currentEta }, 'Live queue entry state saved in Redis');
		} catch (error) {
			// Redis caching failure should not abort transaction, log warning
			logger.warn({ err: error, queueEntryId }, 'Failed to cache live queue entry state in Redis');
		}
	}

	async getLiveEntry(queueEntryId: string): Promise<LiveQueueEntryState | null> {
		try {
			const key = this.getKey(queueEntryId);
			const raw = await this.client.get(key);
			if (!raw) return null;
			return JSON.parse(raw) as LiveQueueEntryState;
		} catch (error) {
			logger.warn({ err: error, queueEntryId }, 'Failed to read live queue entry state from Redis');
			return null;
		}
	}

	async removeLiveEntry(queueEntryId: string): Promise<void> {
		try {
			const key = this.getKey(queueEntryId);
			await this.client.del(key);
		} catch (error) {
			logger.warn({ err: error, queueEntryId }, 'Failed to remove live queue entry from Redis');
		}
	}
}
