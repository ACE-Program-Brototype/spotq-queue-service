import { Router } from 'express';
import { databaseService } from '../../infrastructure/database/index.js';

export const router = Router();

router.get('/health', async (_req, res) => {
	const database = await databaseService.isHealthy();

	const status = database ? 'UP' : 'DOWN';

	res.status(database ? 200 : 503).json({
		status,
		timestamp: new Date().toISOString(),
		checks: {
			application: 'UP',
			database: status,
		},
	});
});
