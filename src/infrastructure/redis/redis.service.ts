import { TYPES } from '@di/types.ts';
import type { IHealthCheckable } from '@domain/index.ts';
import { inject, injectable } from 'inversify';
import type Redis from 'ioredis';
import { redisClient } from './redis.client.ts';

export const REDIS_STATUS = {
	WAIT: 'wait',
	CONNECTING: 'connecting',
	CONNECT: 'connect',
	READY: 'ready',
	RECONNECTING: 'reconnecting',
	CLOSE: 'close',
	END: 'end',
} as const;

export type RedisStatus = (typeof REDIS_STATUS)[keyof typeof REDIS_STATUS];

@injectable()
export class RedisService implements IHealthCheckable {
	constructor(
		@inject(TYPES.Redis.Client)
		private readonly client: Redis = redisClient,
	) {}

	/**
	 * Initiates connection to Redis if in lazy-connect 'wait' state.
	 * In ioredis, calling connect() when already 'connecting', 'connect',
	 * 'ready', or 'reconnecting' throws an error.
	 */
	async connect(): Promise<void> {
		if (this.client.status === REDIS_STATUS.WAIT) {
			await this.client.connect();
		}
	}

	/**
	 * Gracefully terminates the Redis connection if actively connected or attempting connection.
	 */
	async disconnect(): Promise<void> {
		if (
			this.client.status !== REDIS_STATUS.END &&
			this.client.status !== REDIS_STATUS.CLOSE &&
			this.client.status !== REDIS_STATUS.WAIT
		) {
			await this.client.quit();
		}
	}

	async isHealthy(): Promise<boolean> {
		try {
			const res = await this.client.ping();
			return res === 'PONG';
		} catch {
			return false;
		}
	}
}
