import request from 'supertest';
import app from '../src/app.js';
import { PrismaService } from '../src/infrastructure/database/database.service.js';
import { prisma } from '../src/infrastructure/database/prisma.js';
import { redisClient } from '../src/infrastructure/redis/redis.client.js';
import { RedisService } from '../src/infrastructure/redis/redis.service.js';
import { HEALTH_STATUS, HTTP_STATUS, MESSAGES } from '../src/shared/constants/index.js';

describe('Queue Service Integration & Unit Tests', () => {
	let dbSpy: jest.SpyInstance;
	let redisSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		// Spy on the Prisma $queryRaw and Redis ping methods
		dbSpy = jest.spyOn(prisma, '$queryRaw');
		redisSpy = jest.spyOn(redisClient, 'ping');
	});

	afterEach(() => {
		dbSpy.mockRestore();
		redisSpy.mockRestore();
	});

	describe('GET /health', () => {
		it('should return 200 and status UP when both DB and Redis are healthy', async () => {
			dbSpy.mockResolvedValue([{ 1: 1 }]);
			redisSpy.mockResolvedValue('PONG');

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
			expect(dbSpy).toHaveBeenCalled();
			expect(redisSpy).toHaveBeenCalled();
		});

		it('should return 503 and status DOWN when database is unhealthy', async () => {
			dbSpy.mockRejectedValue(new Error('Database connection failed'));
			redisSpy.mockResolvedValue('PONG');

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
			dbSpy.mockResolvedValue([{ 1: 1 }]);
			redisSpy.mockRejectedValue(new Error('Redis connection failed'));

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

	describe('PrismaService & RedisService Health Checks', () => {
		it('PrismaService.isHealthy should return true when healthy', async () => {
			dbSpy.mockResolvedValue([{ 1: 1 }]);
			const healthy = await PrismaService.isHealthy();
			expect(healthy).toBe(true);
		});

		it('PrismaService.isHealthy should return false when unhealthy', async () => {
			dbSpy.mockRejectedValue(new Error('DB Fail'));
			const healthy = await PrismaService.isHealthy();
			expect(healthy).toBe(false);
		});

		it('RedisService.health should return true when healthy', async () => {
			redisSpy.mockResolvedValue('PONG');
			const healthy = await RedisService.health();
			expect(healthy).toBe(true);
		});

		it('RedisService.health should return false when unhealthy', async () => {
			redisSpy.mockRejectedValue(new Error('Redis Fail'));
			const healthy = await RedisService.health();
			expect(healthy).toBe(false);
		});
	});
});
