import { Router } from 'express';
import { prisma } from '../../infrastructure/database/index.js';
import { redisClient } from '../../infrastructure/redis/index.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

const router = Router();
const healthService = new HealthService(prisma, redisClient);
const healthController = new HealthController(healthService);

router.get('/health', healthController.check);

export { router as healthRouter };
