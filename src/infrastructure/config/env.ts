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
	services: {
		restaurantServiceName: validatedEnv.RESTAURANT_SERVICE,
		restaurantServiceUrl: validatedEnv.RESTAURANT_SERVICE_URL,
		etaServiceUrl: validatedEnv.ETA_SERVICE_URL,
		etaServiceTimeoutMs: validatedEnv.ETA_SERVICE_TIMEOUT_MS,
		mockTableCheck: validatedEnv.MOCK_TABLE_CHECK,
	},
	s2s: {
		serviceName: validatedEnv.SERVICE_NAME,
		privateKey: validatedEnv.S2S_PRIVATE_KEY,
	},
	websocket: {
		get path() {
			return process.env.WS_PATH || validatedEnv.WS_PATH;
		},
		get corsOrigin() {
			return process.env.CORS_ORIGIN || validatedEnv.CORS_ORIGIN;
		},
		get useRedisAdapter() {
			return process.env.WS_USE_REDIS_ADAPTER !== undefined
				? process.env.WS_USE_REDIS_ADAPTER === 'true'
				: validatedEnv.WS_USE_REDIS_ADAPTER;
		},
	},
} as const;

export type Config = typeof config;
