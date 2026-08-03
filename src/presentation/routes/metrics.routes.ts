import { Router } from 'express';
import client from 'prom-client';

const router = Router();

router.get('/metrics', async (_req, res) => {
	try {
		res.set('Content-Type', client.register.contentType);
		res.end(await client.register.metrics());
	} catch (error) {
		res.status(500).end(error);
	}
});

export { router as metricsRouter };
