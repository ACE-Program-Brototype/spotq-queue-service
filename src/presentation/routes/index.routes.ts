import { Router } from 'express';
import { healthRouter } from '../../modules/health/index.js';

export const router = Router();

router.use('/', healthRouter);
