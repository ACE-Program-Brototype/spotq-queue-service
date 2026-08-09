import type { HealthStatus } from '@shared/constants/index.ts';

export interface IHealthCheckable {
	isHealthy(): Promise<boolean> | boolean;
}

export interface HealthCheckResult {
	status: HealthStatus;
	timestamp: string;
	checks: {
		application: HealthStatus;
		database: HealthStatus;
		redis: HealthStatus;
	};
}

export interface IHealthService {
	check(): Promise<HealthCheckResult>;
}
