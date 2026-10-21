import { internalQueueController } from '@di/controllers.resolutions.ts';
import { INTERNAL_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';
import { internalS2SAuthMiddleware } from '../middleware/internal-s2s-auth.middleware.ts';
import { validateParams } from '../middleware/validation.middleware.ts';
import { getUserActiveQueueParamsSchema } from '../validators/get-user-active-queue.validator.ts';

export const internalQueueRouter: Router = Router();

internalQueueRouter.use(internalS2SAuthMiddleware());

internalQueueRouter.get(
	INTERNAL_ROUTES.USER_ACTIVE_QUEUE,
	validateParams(getUserActiveQueueParamsSchema),
	internalQueueController.getActiveQueueByUser,
);
