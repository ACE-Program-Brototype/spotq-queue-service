import { ROUTES } from '@shared/index.ts';
import { Router } from 'express';
import { healthRouter } from '../../modules/health/index.ts';
import { metricsRouter } from './metrics.routes.ts';

const router = Router();

router.use(ROUTES.ROOT, healthRouter);
router.use(ROUTES.ROOT, metricsRouter);

export { router };
