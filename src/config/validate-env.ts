import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'testing', 'production']),

	PORT: z.coerce.number().positive(),

	SERVICE_NAME: z.string().min(1),

	LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),

	DATABASE_URL: z.string().url(),
	DIRECT_DATABASE_URL: z.string().url(),

	REDIS_URL: z.string().url(),
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
