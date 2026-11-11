import { customerQueueController } from '@di/controllers.resolutions.ts';
import {
	customerAuthMiddleware,
	validateRequestBody,
	validateRequestParams,
	validateRequestQuery,
} from '@presentation/http/middleware/index.ts';
import {
	getCustomerQueueStatusParamsSchema,
	getCustomerQueueStatusQuerySchema,
} from '@presentation/http/validators/get-customer-queue-status.validator.ts';
import {
	getEtaParamsSchema,
	getEtaQuerySchema,
} from '@presentation/http/validators/get-eta.validator.ts';
import {
	joinQueueBodySchema,
	joinQueueParamsSchema,
} from '@presentation/http/validators/join-queue.validator.ts';
import {
	leaveQueueBodySchema,
	leaveQueueParamsSchema,
} from '@presentation/http/validators/leave-queue.validator.ts';
import { ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';

const customerQueueRouter = Router();

customerQueueRouter.get(
	ROUTES.CUSTOMER_ACTIVE_QUEUE,
	customerAuthMiddleware,
	customerQueueController.getActiveQueue,
);

customerQueueRouter.get(
	ROUTES.GET_ETA,
	customerAuthMiddleware,
	validateRequestParams(getEtaParamsSchema),
	validateRequestQuery(getEtaQuerySchema),
	customerQueueController.getEta,
);

customerQueueRouter.get(
	ROUTES.CUSTOMER_QUEUE_STATUS,
	customerAuthMiddleware,
	validateRequestParams(getCustomerQueueStatusParamsSchema),
	validateRequestQuery(getCustomerQueueStatusQuerySchema),
	customerQueueController.getQueueStatus,
);

customerQueueRouter.post(
	ROUTES.JOIN_QUEUE,
	customerAuthMiddleware,
	validateRequestParams(joinQueueParamsSchema),
	validateRequestBody(joinQueueBodySchema),
	customerQueueController.joinQueue,
);

customerQueueRouter.post(
	ROUTES.CUSTOMER_LEAVE_QUEUE,
	customerAuthMiddleware,
	validateRequestParams(leaveQueueParamsSchema),
	validateRequestBody(leaveQueueBodySchema),
	customerQueueController.leaveQueue,
);

export { customerQueueRouter };
