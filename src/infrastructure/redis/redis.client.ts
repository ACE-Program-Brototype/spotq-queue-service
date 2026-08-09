import { config } from '@infrastructure/config/index.js';
import { logger } from '@infrastructure/logger/index.js';
import { MESSAGES } from '@shared/constants/index.js';
import { createClient } from 'redis';

const isTls = config.redis.url.startsWith('rediss://');

export const redisClient = createClient({
	url: config.redis.url,
	socket: {
		tls: isTls ? true : undefined,
		reconnectStrategy(retries) {
			if (retries > 10) {
				return new Error(MESSAGES.REDIS_RECONNECT_FAILED);
			}

			return Math.min(retries * 500, 5000);
		},
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
