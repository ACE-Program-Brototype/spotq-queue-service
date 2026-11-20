export const HEALTH_STATUS = {
	UP: 'UP',
	DOWN: 'DOWN',
} as const;

export type HealthStatus = (typeof HEALTH_STATUS)[keyof typeof HEALTH_STATUS];
