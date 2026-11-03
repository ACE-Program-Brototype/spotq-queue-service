import { internalQueueController } from '@di/controllers.resolutions.ts';
import { validateRequestParams } from '@presentation/http/middleware/index.ts';
import { internalS2SAuthMiddleware } from '@presentation/http/middleware/internal-s2s-auth.middleware.ts';
import { getUserActiveQueueParamsSchema } from '@presentation/http/validators/get-user-active-queue.validator.ts';
import { getCustomerQueueStatusParamsSchema } from '@presentation/http/validators/internal/get-customer-queue-status.validator.ts';
import { INTERNAL_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';

export const internalQueueRouter: Router = Router();

internalQueueRouter.use(internalS2SAuthMiddleware());

internalQueueRouter.get(
	INTERNAL_ROUTES.USER_ACTIVE_QUEUE,
	validateRequestParams(getUserActiveQueueParamsSchema),
	internalQueueController.getActiveQueueByUser,
);

internalQueueRouter.get(
	INTERNAL_ROUTES.GET_CUSTOMER_STATUS,
	validateRequestParams(getCustomerQueueStatusParamsSchema),
	internalQueueController.getCustomerQueueStatus,
);
