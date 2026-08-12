import dotenv from 'dotenv';
import { validateEnv } from './validate-env.ts';

dotenv.config();

const validatedEnv = validateEnv();

export const config = {
	nodeEnv: validatedEnv.NODE_ENV,
	port: validatedEnv.PORT,
	serviceName: validatedEnv.SERVICE_NAME,
	logLevel: validatedEnv.LOG_LEVEL,
	database: {
		url: validatedEnv.DATABASE_URL,
		caCert: validatedEnv.DATABASE_CA_CERT,
	},
	redis: {
		url: validatedEnv.REDIS_URL,
	},
} as const;

export type Config = typeof config;
