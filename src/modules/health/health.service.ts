import type { HealthCheckResult, IHealthCheckable, IHealthService } from '@domain/index.ts';
import { HEALTH_STATUS } from '@shared/constants/index.ts';

export class HealthService implements IHealthService {
	private readonly databaseService: IHealthCheckable;
	private readonly redisService: IHealthCheckable;

	constructor(databaseService: IHealthCheckable, redisService: IHealthCheckable) {
		this.databaseService = databaseService;
		this.redisService = redisService;
	}

	async check(): Promise<HealthCheckResult> {
		const [dbHealthy, redisHealthy] = await Promise.all([
			this.databaseService.isHealthy(),
			this.redisService.isHealthy(),
		]);

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
}
