import type { PrismaClient } from '@prisma/client';
import { HEALTH_STATUS, type HealthStatus } from '@shared/constants/index.js';
import type { RedisClientType } from 'redis';

export interface HealthCheckResult {
	status: HealthStatus;
	timestamp: string;
	checks: {
		application: HealthStatus;
		database: HealthStatus;
		redis: HealthStatus;
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
		const status = isHealthy ? HEALTH_STATUS.UP : HEALTH_STATUS.DOWN;

		return {
			status,
			timestamp: new Date().toISOString(),
			checks: {
				application: HEALTH_STATUS.UP,
				database: dbHealthy ? HEALTH_STATUS.UP : HEALTH_STATUS.DOWN,
				redis: redisHealthy ? HEALTH_STATUS.UP : HEALTH_STATUS.DOWN,
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
