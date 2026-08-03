import { Router } from 'express';
import { healthRouter } from '../../modules/health/index.js';
import { metricsRouter } from './metrics.routes.js';

export const router = Router();

router.use('/', healthRouter);
router.use('/', metricsRouter);
