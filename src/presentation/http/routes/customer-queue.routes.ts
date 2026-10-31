import { customerQueueController } from '@di/controllers.resolutions.ts';
import {
	customerAuthMiddleware,
	validateRequestBody,
	validateRequestParams,
	validateRequestQuery,
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

customerQueueRouter.get(
	ROUTES.GET_ETA,
	customerAuthMiddleware,
	validateRequestParams(getEtaParamsSchema),
	validateRequestQuery(getEtaQuerySchema),
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
