import { TYPES } from '@di/types.ts';
import type { IHealthCheckable } from '@domain/index.ts';
import { inject, injectable } from 'inversify';
import type Redis from 'ioredis';
import { redisClient } from './redis.client.ts';

@injectable()
export class RedisService implements IHealthCheckable {
	constructor(
		@inject(TYPES.Redis.Client)
		private readonly client: Redis = redisClient,
	) {}

	async connect(): Promise<void> {
		if (this.client.status !== 'ready' && this.client.status !== 'connecting') {
			await this.client.connect();
		}
	}

	async disconnect(): Promise<void> {
		if (this.client.status === 'ready' || this.client.status === 'connecting') {
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

	async health(): Promise<boolean> {
		return this.isHealthy();
	}
}
