import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'testing', 'production', 'test']).default('development'),
	PORT: z.coerce.number().positive().default(3004),
	SERVICE_NAME: z.string().min(1).default('spotq-queue-service'),
	LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
	DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
	DIRECT_DATABASE_URL: z.string().optional(),
	DATABASE_CA_CERT: z.string().optional(),
	REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
	RESTAURANT_SERVICE_URL: z.string().default('http://spotq-restaurant-service:3001'),
	ETA_SERVICE_URL: z.string().default('http://spotq-ml-eta-service:8000'),
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
