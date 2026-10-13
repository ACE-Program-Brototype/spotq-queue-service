import type { RedisAdapterInstances } from '@application/ports/services/redis-adapter.port.ts';
import { config } from '@infrastructure/config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';

export type { RedisAdapterInstances };

export function createRedisAdapter(
	connectionUrl: string = config.redis.url,
): RedisAdapterInstances {
	const pubClient = new IORedis(connectionUrl, {
		maxRetriesPerRequest: null,
		enableReadyCheck: false,
		lazyConnect: false,
	});

	const subClient = pubClient.duplicate();

	pubClient.on('error', (err) => {
		logger.error({ err }, 'WebSocket Redis Pub Client error');
	});

	subClient.on('error', (err) => {
		logger.error({ err }, 'WebSocket Redis Sub Client error');
	});

	const adapter = createAdapter(pubClient, subClient);

	const close = async () => {
		try {
			await Promise.all([pubClient.quit(), subClient.quit()]);
			logger.info('WebSocket Redis Pub/Sub clients disconnected successfully');
		} catch (err) {
			logger.error({ err }, 'Error closing WebSocket Redis Pub/Sub clients');
		}
	};

	return {
		pubClient,
		subClient,
		adapter,
		close,
	};
}
