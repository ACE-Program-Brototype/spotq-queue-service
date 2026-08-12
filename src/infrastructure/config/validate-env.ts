import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'testing', 'production', 'test']).default('development'),
	PORT: z.coerce.number().positive().default(3004),
	SERVICE_NAME: z.string().min(1).default('spotq-queue-service'),
	LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
	DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
	DATABASE_CA_CERT: z.string().optional(),
	REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
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
