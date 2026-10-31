import { HealthService } from '@infrastructure/services/health.service.ts';
import { HEALTH_STATUS } from '@shared/constants/index.ts';

describe('HealthService Unit Tests', () => {
	let mockDatabaseService: { isHealthy: jest.Mock };
	let mockRedisService: { isHealthy: jest.Mock };
	let mockBullmqService: { isHealthy: jest.Mock };
	let healthService: HealthService;

	beforeEach(() => {
		mockDatabaseService = { isHealthy: jest.fn() };
		mockRedisService = { isHealthy: jest.fn() };
		mockBullmqService = { isHealthy: jest.fn() };

		healthService = new HealthService(
			mockDatabaseService as never,
			mockRedisService as never,
			mockBullmqService as never,
		);
	});

	it('should return UP when PostgreSQL, Redis, and BullMQ are all healthy', async () => {
		mockDatabaseService.isHealthy.mockResolvedValue(true);
		mockRedisService.isHealthy.mockResolvedValue(true);
		mockBullmqService.isHealthy.mockResolvedValue(true);

		const result = await healthService.check();

		expect(result.status).toBe(HEALTH_STATUS.UP);
		expect(result.checks).toEqual({
			application: HEALTH_STATUS.UP,
			database: HEALTH_STATUS.UP,
			redis: HEALTH_STATUS.UP,
			bullmq: HEALTH_STATUS.UP,
		});
	});

	it('should return DOWN when BullMQ is unhealthy', async () => {
		mockDatabaseService.isHealthy.mockResolvedValue(true);
		mockRedisService.isHealthy.mockResolvedValue(true);
		mockBullmqService.isHealthy.mockResolvedValue(false);

		const result = await healthService.check();

		expect(result.status).toBe(HEALTH_STATUS.DOWN);
		expect(result.checks.bullmq).toBe(HEALTH_STATUS.DOWN);
	});

	it('should return DOWN when Database is unhealthy', async () => {
		mockDatabaseService.isHealthy.mockResolvedValue(false);
		mockRedisService.isHealthy.mockResolvedValue(true);
		mockBullmqService.isHealthy.mockResolvedValue(true);

		const result = await healthService.check();

		expect(result.status).toBe(HEALTH_STATUS.DOWN);
		expect(result.checks.database).toBe(HEALTH_STATUS.DOWN);
	});

	it('should return DOWN when Redis is unhealthy', async () => {
		mockDatabaseService.isHealthy.mockResolvedValue(true);
		mockRedisService.isHealthy.mockResolvedValue(false);
		mockBullmqService.isHealthy.mockResolvedValue(true);

		const result = await healthService.check();

		expect(result.status).toBe(HEALTH_STATUS.DOWN);
		expect(result.checks.redis).toBe(HEALTH_STATUS.DOWN);
	});
});
