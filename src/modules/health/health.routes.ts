import { databaseService } from '@infrastructure/database/index.ts';
import { redisService } from '@infrastructure/redis/index.ts';
import { ROUTES } from '@shared/index.ts';
import { Router } from 'express';
import { HealthController } from './health.controller.ts';
import { HealthService } from './health.service.ts';

const router = Router();
const healthService = new HealthService(databaseService, redisService);
const healthController = new HealthController(healthService);

router.get(ROUTES.HEALTH, healthController.check);

export { healthController, healthService, router as healthRouter };
