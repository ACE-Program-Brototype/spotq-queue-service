import { internalQueueController } from '@di/controllers.resolutions.ts';
import { INTERNAL_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';
import { internalS2SAuthMiddleware } from '../middleware/internal-s2s-auth.middleware.ts';
import { validateBody, validateParams } from '../middleware/validation.middleware.ts';
import { getUserActiveQueueParamsSchema } from '../validators/get-user-active-queue.validator.ts';
import { getCustomerQueueStatusBodySchema } from '../validators/internal/get-customer-queue-status.validator.ts';

export const internalQueueRouter: Router = Router();

internalQueueRouter.use(internalS2SAuthMiddleware());

internalQueueRouter.get(
	INTERNAL_ROUTES.USER_ACTIVE_QUEUE,
	validateParams(getUserActiveQueueParamsSchema),
	internalQueueController.getActiveQueueByUser,
);

internalQueueRouter.get(
	INTERNAL_ROUTES.GET_CUSTOMER_STATUS,
	validateBody(getCustomerQueueStatusBodySchema),
	internalQueueController.getCustomerQueueStatus,
);
