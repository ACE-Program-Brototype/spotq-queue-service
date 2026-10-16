import { healthRouter } from '@modules/health/index.ts';
import { ROUTES } from '@shared/index.ts';
import { Router } from 'express';
import { metricsRouter } from './metrics.routes.ts';
import { staffQueueRouter } from './staff-queue.routes.ts';

const router = Router();

router.use(ROUTES.ROOT, healthRouter);
router.use(ROUTES.ROOT, metricsRouter);
router.use(ROUTES.STAFF_BASE, staffQueueRouter);

export { router };
