import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'testing', 'production', 'test']).default('development'),
	PORT: z.coerce.number().positive().default(3004),
	SERVICE_NAME: z.string().min(1).default('queue-service'),
	LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
	DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
	DIRECT_DATABASE_URL: z.string().optional(),
	DATABASE_CA_CERT: z.string().optional(),
	REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
	RESTAURANT_SERVICE_URL: z.string().default('http://spotq-restaurant-service:3001'),
	RESTAURANT_SERVICE: z.string().default('restaurant-service'),
	ETA_SERVICE_URL: z.string().default('http://spotq-ml-eta-service:8000'),
	S2S_PRIVATE_KEY: z.string().optional(),
	MOCK_TABLE_CHECK: z
		.preprocess((val) => {
			if (typeof val === 'string') return val.toLowerCase() === 'true';
			if (typeof val === 'boolean') return val;
			return false;
		}, z.boolean())
		.default(false),
	CORS_ORIGIN: z.string().default('*'),
	WS_PATH: z.string().default('/ws'),
	WS_USE_REDIS_ADAPTER: z
		.preprocess((val) => {
			if (typeof val === 'string') return val.toLowerCase() === 'true';
			if (typeof val === 'boolean') return val;
			return false;
		}, z.boolean())
		.default(false),
	FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
	FIREBASE_CLIENT_EMAIL: z.string().min(1, 'FIREBASE_CLIENT_EMAIL is required'),
	FIREBASE_PRIVATE_KEY: z.string().min(1, 'FIREBASE_PRIVATE_KEY is required'),
	FCM_ENABLED: z
		.preprocess((val) => {
			if (typeof val === 'string') return val.toLowerCase() === 'true';
			if (typeof val === 'boolean') return val;
			return true;
		}, z.boolean())
		.default(true),
	FCM_MAX_RETRIES: z.coerce.number().int().nonnegative().default(2),
	FCM_RETRY_DELAY_MS: z.coerce.number().int().positive().default(500),
});

export const validateEnv = () => {
	const result = envSchema.safeParse(process.env);

	if (!result.success) {
		console.error('Invalid environment configuration\n');

		for (const issue of result.error.issues) {
			console.error(`${issue.path.join('.')}: ${issue.message}`);
		}

		process.exit(1);
	}

	return result.data;
};

export type Env = z.infer<typeof envSchema>;
