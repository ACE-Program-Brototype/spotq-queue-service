import type { IHealthCheckable } from '@domain/index.ts';
import type { RedisClientType } from 'redis';
import { redisClient } from './redis.client.ts';

export class RedisService implements IHealthCheckable {
	private readonly client: RedisClientType;

	constructor(client: RedisClientType = redisClient) {
		this.client = client;
	}

	async connect(): Promise<void> {
		if (!this.client.isOpen) {
			await this.client.connect();
		}
	}

	async disconnect(): Promise<void> {
		if (this.client.isOpen) {
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

export const redisService = new RedisService(redisClient);
