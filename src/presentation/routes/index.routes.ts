import { Router } from 'express';
import { healthRouter } from '../../modules/health/index.ts';
import { metricsRouter } from './metrics.routes.ts';

const router = Router();

router.use('/', healthRouter);
router.use('/', metricsRouter);

export { router };
