import type {
	IQueueCacheService,
	LiveQueueEntryState,
} from '@application/ports/cache/queue-cache.port.ts';
import { TYPES } from '@di/types.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { inject, injectable } from 'inversify';
import type Redis from 'ioredis';
import { REDIS_QUEUE_CACHE } from './redis.constants.ts';

@injectable()
export class RedisQueueCacheService implements IQueueCacheService {
	public static readonly KEY_PREFIX = REDIS_QUEUE_CACHE.KEY_PREFIX;
	public static readonly TTL_SECONDS = REDIS_QUEUE_CACHE.TTL_SECONDS;
	public static readonly POSITION_KEY_PREFIX = REDIS_QUEUE_CACHE.POSITION_KEY_PREFIX;
	public static readonly POSITION_KEY_SUFFIX = REDIS_QUEUE_CACHE.POSITION_KEY_SUFFIX;
	public static readonly POSITION_TTL_SECONDS = REDIS_QUEUE_CACHE.POSITION_TTL_SECONDS;

	constructor(
		@inject(TYPES.Redis.Client)
		private readonly client: Redis,
	) {}

	private getKey(queueEntryId: string): string {
		return `${REDIS_QUEUE_CACHE.KEY_PREFIX}${queueEntryId}`;
	}

	private getPositionKey(queueEntryId: string): string {
		return `${REDIS_QUEUE_CACHE.POSITION_KEY_PREFIX}${queueEntryId}${REDIS_QUEUE_CACHE.POSITION_KEY_SUFFIX}`;
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

			await this.client.set(key, JSON.stringify(state), 'EX', REDIS_QUEUE_CACHE.TTL_SECONDS);

			logger.debug({ queueEntryId, position, currentEta }, 'Live queue entry state saved in Redis');
		} catch (error) {
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
			const positionKey = this.getPositionKey(queueEntryId);
			await Promise.all([this.client.del(key), this.client.del(positionKey)]);
		} catch (error) {
			logger.warn({ err: error, queueEntryId }, 'Failed to remove live queue entry from Redis');
		}
	}

	async cachePosition(
		queueEntryId: string,
		position: number,
		ttlSeconds: number = REDIS_QUEUE_CACHE.POSITION_TTL_SECONDS,
	): Promise<void> {
		try {
			const key = this.getPositionKey(queueEntryId);
			await this.client.set(key, String(position), 'EX', ttlSeconds);
			logger.debug({ queueEntryId, position, ttlSeconds }, 'Queue entry position cached in Redis');
		} catch (error) {
			logger.warn({ err: error, queueEntryId }, 'Failed to cache queue entry position in Redis');
		}
	}

	async getCachedPosition(queueEntryId: string): Promise<number | null> {
		try {
			const key = this.getPositionKey(queueEntryId);
			const raw = await this.client.get(key);
			if (raw === null) return null;
			const parsed = Number.parseInt(raw, 10);
			return Number.isNaN(parsed) ? null : parsed;
		} catch (error) {
			logger.warn({ err: error, queueEntryId }, 'Failed to read cached queue position from Redis');
			return null;
		}
	}

	async invalidatePosition(queueEntryId: string): Promise<void> {
		try {
			const key = this.getPositionKey(queueEntryId);
			await this.client.del(key);
			logger.debug({ queueEntryId }, 'Queue entry position cache invalidated in Redis');
		} catch (error) {
			logger.warn({ err: error, queueEntryId }, 'Failed to invalidate queue position in Redis');
		}
	}
}
