import { Router } from 'express';
import { PrismaService } from '../../infrastructure/database/index.js';
import { RedisService } from '../../infrastructure/redis/index.js';

export const router = Router();

router.get('/health', async (_req, res) => {
	const database = await PrismaService.isHealthy();
	const redis = await RedisService.health();

	const isHealthy = database && redis;
	const status = isHealthy ? 'UP' : 'DOWN';

	res.status(isHealthy ? 200 : 503).json({
		status,
		timestamp: new Date().toISOString(),
		checks: {
			application: 'UP',
			database: database ? 'UP' : 'DOWN',
			redis: redis ? 'UP' : 'DOWN',
		},
	});
});
