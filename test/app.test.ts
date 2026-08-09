jest.mock('ioredis', () => {
	return jest.fn().mockImplementation(() => {
		return {
			on: jest.fn(),
			ping: jest.fn().mockResolvedValue('PONG'),
			quit: jest.fn().mockResolvedValue(undefined),
			close: jest.fn().mockResolvedValue(undefined),
		};
	});
});

import { databaseService, prisma } from '@infrastructure/database/index.ts';
import { bullmqQueueService } from '@infrastructure/queue/index.ts';
import { redisClient, redisService } from '@infrastructure/redis/index.ts';
import { HEALTH_STATUS, HTTP_STATUS, MESSAGES } from '@shared/constants/index.ts';
import request from 'supertest';
import app from '../src/app.ts';

describe('Queue Service Integration & Unit Tests', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await bullmqQueueService.close();
	});

	describe('GET /health', () => {
		it('should return 200 and status UP when both DB and Redis are healthy', async () => {
			jest.spyOn(databaseService, 'isHealthy').mockResolvedValue(true);
			jest.spyOn(redisService, 'isHealthy').mockResolvedValue(true);

			const res = await request(app).get('/health');

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(res.body).toEqual(
				expect.objectContaining({
					status: HEALTH_STATUS.UP,
					checks: expect.objectContaining({
						application: HEALTH_STATUS.UP,
						database: HEALTH_STATUS.UP,
						redis: HEALTH_STATUS.UP,
					}),
				}),
			);
		});

		it('should return 503 and status DOWN when database is unhealthy', async () => {
			jest.spyOn(databaseService, 'isHealthy').mockResolvedValue(false);
			jest.spyOn(redisService, 'isHealthy').mockResolvedValue(true);

			const res = await request(app).get('/health');

			expect(res.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
			expect(res.body).toEqual(
				expect.objectContaining({
					status: HEALTH_STATUS.DOWN,
					checks: expect.objectContaining({
						application: HEALTH_STATUS.UP,
						database: HEALTH_STATUS.DOWN,
						redis: HEALTH_STATUS.UP,
					}),
				}),
			);
		});

		it('should return 503 and status DOWN when Redis is unhealthy', async () => {
			jest.spyOn(databaseService, 'isHealthy').mockResolvedValue(true);
			jest.spyOn(redisService, 'isHealthy').mockResolvedValue(false);

			const res = await request(app).get('/health');

			expect(res.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
			expect(res.body).toEqual(
				expect.objectContaining({
					status: HEALTH_STATUS.DOWN,
					checks: expect.objectContaining({
						application: HEALTH_STATUS.UP,
						database: HEALTH_STATUS.UP,
						redis: HEALTH_STATUS.DOWN,
					}),
				}),
			);
		});
	});

	describe('Routing', () => {
		it('should return 404 not found for invalid routes', async () => {
			const res = await request(app).get('/invalid-route-xyz');

			expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
			expect(res.body).toEqual(
				expect.objectContaining({
					error: MESSAGES.NOT_FOUND,
					message: 'Cannot GET /invalid-route-xyz',
				}),
			);
		});
	});

	describe('DatabaseService, RedisService & BullMQ Health Checks', () => {
		it('databaseService.isHealthy should return true when Prisma query succeeds', async () => {
			jest.spyOn(prisma, '$queryRaw').mockResolvedValue([{ 1: 1 }]);
			const healthy = await databaseService.isHealthy();
			expect(healthy).toBe(true);
		});

		it('databaseService.isHealthy should return false when Prisma query fails', async () => {
			jest.spyOn(prisma, '$queryRaw').mockRejectedValue(new Error('DB error'));
			const healthy = await databaseService.isHealthy();
			expect(healthy).toBe(false);
		});

		it('redisService.health should return true when Redis ping succeeds', async () => {
			jest.spyOn(redisClient, 'ping').mockResolvedValue('PONG');
			const healthy = await redisService.health();
			expect(healthy).toBe(true);
		});

		it('redisService.health should return false when Redis ping fails', async () => {
			jest.spyOn(redisClient, 'ping').mockRejectedValue(new Error('Redis error'));
			const healthy = await redisService.health();
			expect(healthy).toBe(false);
		});

		it('bullmqQueueService.isHealthy should return true when ping succeeds', async () => {
			jest.spyOn(bullmqQueueService['connection'], 'ping').mockResolvedValue('PONG');
			const healthy = await bullmqQueueService.isHealthy();
			expect(healthy).toBe(true);
		});

		it('bullmqQueueService.isHealthy should return false when ping fails', async () => {
			jest
				.spyOn(bullmqQueueService['connection'], 'ping')
				.mockRejectedValue(new Error('Redis error'));
			const healthy = await bullmqQueueService.isHealthy();
			expect(healthy).toBe(false);
		});
	});
});
