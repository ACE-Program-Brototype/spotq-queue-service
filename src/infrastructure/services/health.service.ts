import { TYPES } from '@di/types.ts';
import type { HealthCheckResult, IHealthCheckable, IHealthService } from '@domain/index.ts';
import { HEALTH_STATUS } from '@shared/constants/index.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class HealthService implements IHealthService {
	constructor(
		@inject(TYPES.Infrastructure.DatabaseService)
		private readonly databaseService: IHealthCheckable,
		@inject(TYPES.Infrastructure.RedisService)
		private readonly redisService: IHealthCheckable,
		@inject(TYPES.Services.QueueService)
		private readonly bullmqService: IHealthCheckable,
	) {}

	async check(): Promise<HealthCheckResult> {
		const [dbHealthy, redisHealthy, bullmqHealthy] = await Promise.all([
			this.databaseService.isHealthy(),
			this.redisService.isHealthy(),
			this.bullmqService.isHealthy(),
		]);

		const isHealthy = dbHealthy && redisHealthy && bullmqHealthy;
		const status = isHealthy ? HEALTH_STATUS.UP : HEALTH_STATUS.DOWN;

		return {
			status,
			timestamp: new Date().toISOString(),
			checks: {
				application: HEALTH_STATUS.UP,
				database: dbHealthy ? HEALTH_STATUS.UP : HEALTH_STATUS.DOWN,
				redis: redisHealthy ? HEALTH_STATUS.UP : HEALTH_STATUS.DOWN,
				bullmq: bullmqHealthy ? HEALTH_STATUS.UP : HEALTH_STATUS.DOWN,
			},
		};
	}
}
