import { redisClient } from './redis.client.js';

// biome-ignore lint/complexity/noStaticOnlyClass: service structure uses static class methods
export class RedisService {
	static async connect(): Promise<void> {
		if (!redisClient.isOpen) {
			await redisClient.connect();
		}

		await redisClient.ping();
	}

	static async disconnect(): Promise<void> {
		if (redisClient.isOpen) {
			await redisClient.quit();
		}
	}

	static async health(): Promise<boolean> {
		try {
			await redisClient.ping();
			return true;
		} catch {
			return false;
		}
	}
}
