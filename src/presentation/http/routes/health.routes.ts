import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import type { HealthController } from '@presentation/http/controllers/health.controller.ts';
import { ROUTES } from '@shared/index.ts';
import { Router } from 'express';

const router = Router();
const healthController = container.get<HealthController>(TYPES.Controllers.HealthController);

router.get(ROUTES.HEALTH, healthController.check);

export { router as healthRouter };
