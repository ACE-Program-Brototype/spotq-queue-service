import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import type { InternalQueueController } from '@presentation/http/controllers/internal-queue.controller.ts';
import { INTERNAL_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';
import { internalS2SAuthMiddleware } from '../middleware/internal-s2s-auth.middleware.ts';
import { validateParams } from '../middleware/validation.middleware.ts';
import { getUserActiveQueueParamsSchema } from '../validators/get-user-active-queue.validator.ts';

export const internalQueueRouter: Router = Router();

const internalQueueController = container.get<InternalQueueController>(
	TYPES.Controller.InternalQueueController,
);

internalQueueRouter.use(internalS2SAuthMiddleware());

internalQueueRouter.get(
	INTERNAL_ROUTES.USER_ACTIVE_QUEUE,
	validateParams(getUserActiveQueueParamsSchema),
	(req, res) => internalQueueController.getActiveQueueByUser(req, res),
);
