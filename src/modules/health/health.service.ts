import type { PrismaClient } from '@prisma/client';
import type { RedisClientType } from 'redis';

export interface HealthCheckResult {
	status: 'UP' | 'DOWN';
	timestamp: string;
	checks: {
		application: 'UP';
		database: 'UP' | 'DOWN';
		redis: 'UP' | 'DOWN';
	};
}

export class HealthService {
	private readonly prisma: PrismaClient;
	private readonly redisClient: RedisClientType;

	constructor(prisma: PrismaClient, redisClient: RedisClientType) {
		this.prisma = prisma;
		this.redisClient = redisClient;
	}

	async check(): Promise<HealthCheckResult> {
		const [dbHealthy, redisHealthy] = await Promise.all([this.checkDatabase(), this.checkRedis()]);

		const isHealthy = dbHealthy && redisHealthy;
		const status = isHealthy ? 'UP' : 'DOWN';

		return {
			status,
			timestamp: new Date().toISOString(),
			checks: {
				application: 'UP',
				database: dbHealthy ? 'UP' : 'DOWN',
				redis: redisHealthy ? 'UP' : 'DOWN',
			},
		};
	}

	private async checkDatabase(): Promise<boolean> {
		try {
			await this.prisma.$queryRaw`SELECT 1`;
			return true;
		} catch {
			return false;
		}
	}

	private async checkRedis(): Promise<boolean> {
		try {
			const response = await this.redisClient.ping();
			return response === 'PONG';
		} catch {
			return false;
		}
	}
}
