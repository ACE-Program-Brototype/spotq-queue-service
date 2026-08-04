import 'dotenv/config';

import { validateEnv } from './validate-env.js';

const env = validateEnv();

export const config = {
	server: {
		port: env.PORT,
		nodeEnv: env.NODE_ENV,
	},

	service: {
		name: env.SERVICE_NAME,
		logLevel: env.LOG_LEVEL,
	},

	database: {
		url: env.DATABASE_URL,
		directUrl: env.DATABASE_URL,
	},

	redis: {
		url: env.REDIS_URL,
	},
} as const;
