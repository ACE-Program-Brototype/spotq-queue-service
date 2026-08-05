import { createClient } from 'redis';

import { config } from '../../config/index.js';
import { logger } from '../logger/index.js';

const isTls = config.redis.url.startsWith('rediss://');

export const redisClient = createClient({
	url: config.redis.url,
	socket: {
		tls: isTls ? true : undefined,
		reconnectStrategy(retries) {
			if (retries > 10) {
				return new Error('Redis reconnect failed');
			}

			return Math.min(retries * 500, 5000);
		},
	},
});

redisClient.on('connect', () => {
	logger.info('Connecting to Redis...');
});

redisClient.on('ready', () => {
	logger.info('Redis connected');
});

redisClient.on('reconnecting', () => {
	logger.info('Redis reconnecting...');
});

redisClient.on('error', (error) => {
	logger.error(error, 'Redis Error');
});
