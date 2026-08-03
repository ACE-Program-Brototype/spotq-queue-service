import { createClient } from 'redis';

import { config } from '../../config/index.js';

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
	console.log('Connecting to Redis...');
});

redisClient.on('ready', () => {
	console.log('Redis connected');
});

redisClient.on('reconnecting', () => {
	console.log('Redis reconnecting...');
});

redisClient.on('error', (error) => {
	console.error('Redis Error:', error);
});
