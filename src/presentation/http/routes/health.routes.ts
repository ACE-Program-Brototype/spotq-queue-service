import { healthController } from '@di/controllers.resolutions.ts';
import { ROUTES } from '@shared/index.ts';
import { Router } from 'express';

const router = Router();

router.get(ROUTES.HEALTH, healthController.check);

export { router as healthRouter };
