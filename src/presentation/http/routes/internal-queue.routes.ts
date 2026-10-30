import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import type { InternalQueueController } from '@presentation/http/controllers/internal-queue.controller.ts';
import { validateRequestParams } from '@presentation/http/middleware/index.ts';
import { getUserActiveQueueParamsSchema } from '@presentation/http/validators/get-user-active-queue.validator.ts';
import { getCustomerQueueStatusParamsSchema } from '@presentation/http/validators/internal/get-customer-queue-status.validator.ts';
import { INTERNAL_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';
import { internalS2SAuthMiddleware } from '../middleware/internal-s2s-auth.middleware.ts';

export const internalQueueRouter: Router = Router();
const internalQueueController = container.get<InternalQueueController>(
	TYPES.Controllers.InternalQueueController,
);

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
