import { healthRouter } from '@modules/health/index.ts';
import { INTERNAL_ROUTES, ROUTES } from '@shared/index.ts';
import { Router } from 'express';
import { internalQueueRouter } from './internal-queue.routes.ts';
import { metricsRouter } from './metrics.routes.ts';
import { staffQueueRouter } from './staff-queue.routes.ts';

const router = Router();

router.use(ROUTES.ROOT, healthRouter);
router.use(ROUTES.ROOT, metricsRouter);
router.use(ROUTES.STAFF_BASE, staffQueueRouter);
router.use(INTERNAL_ROUTES.BASE, internalQueueRouter);

export { router };
