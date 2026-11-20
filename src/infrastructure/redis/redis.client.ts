import { config } from '@infrastructure/config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { MESSAGES } from '@shared/constants/index.ts';
import Redis from 'ioredis';

const isTls = config.redis.url.startsWith('rediss://');

export const redisClient = new Redis(config.redis.url, {
	tls: isTls ? {} : undefined,
	maxRetriesPerRequest: null,
	enableReadyCheck: true,
	lazyConnect: true,
	retryStrategy(retries) {
		if (retries > 10) {
			logger.error(MESSAGES.REDIS_RECONNECT_FAILED);
			return null;
		}

		return Math.min(retries * 500, 5000);
	},
});

redisClient.on('connect', () => {
	logger.info(MESSAGES.REDIS_CONNECTING);
});

redisClient.on('ready', () => {
	logger.info(MESSAGES.REDIS_CONNECTED);
});

redisClient.on('reconnecting', () => {
	logger.warn(MESSAGES.REDIS_RECONNECTING);
});

redisClient.on('error', (error) => {
	logger.error({ err: error }, MESSAGES.REDIS_ERROR);
});
