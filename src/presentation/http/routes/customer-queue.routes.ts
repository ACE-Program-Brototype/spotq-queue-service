import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import type { CustomerQueueController } from '@presentation/http/controllers/customer-queue.controller.ts';
import {
	customerAuthMiddleware,
	validateQuery,
	validateRequestBody,
	validateRequestParams,
} from '@presentation/http/middleware/index.ts';
import {
	getEtaParamsSchema,
	getEtaQuerySchema,
} from '@presentation/http/validators/get-eta.validator.ts';
import {
	joinQueueBodySchema,
	joinQueueParamsSchema,
} from '@presentation/http/validators/join-queue.validator.ts';
import { ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';

const customerQueueRouter = Router();
const customerQueueController = container.get<CustomerQueueController>(
	TYPES.Controllers.CustomerQueueController,
);

customerQueueRouter.get(
	ROUTES.GET_ETA,
	customerAuthMiddleware,
	validateRequestParams(getEtaParamsSchema),
	validateQuery(getEtaQuerySchema),
	customerQueueController.getEta,
);

customerQueueRouter.post(
	ROUTES.JOIN_QUEUE,
	customerAuthMiddleware,
	validateRequestParams(joinQueueParamsSchema),
	validateRequestBody(joinQueueBodySchema),
	customerQueueController.joinQueue,
);

export { customerQueueRouter };
