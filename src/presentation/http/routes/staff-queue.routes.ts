import { staffQueueController } from '@di/controllers.resolutions.ts';
import {
	staffAuthMiddleware,
	validateRequestBody,
	validateRequestParams,
	validateRequestQuery,
} from '@presentation/http/middleware/index.ts';
import {
	assignTablesBodySchema,
	assignTablesParamsSchema,
} from '@presentation/http/validators/assign-table.validator.ts';
import {
	getStaffQueueParamsSchema,
	getStaffQueueQuerySchema,
} from '@presentation/http/validators/get-staff-queue.validator.ts';
import {
	registerWalkInBodySchema,
	registerWalkInParamsSchema,
} from '@presentation/http/validators/register-walk-in.validator.ts';
import { ringCustomerParamsSchema } from '@presentation/http/validators/ring-customer.validator.ts';
import { ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';

/**
 * Express router handling staff queue management endpoints.
 *
 * Controllers are injected from the Inversify IoC container.
 */
const staffQueueRouter = Router();

staffQueueRouter.get(
	ROUTES.STAFF_QUEUE,
	staffAuthMiddleware,
	validateRequestParams(getStaffQueueParamsSchema),
	validateRequestQuery(getStaffQueueQuerySchema),
	staffQueueController.getLiveQueue,
);

staffQueueRouter.post(
	ROUTES.REGISTER_WALK_IN,
	staffAuthMiddleware,
	validateRequestParams(registerWalkInParamsSchema),
	validateRequestBody(registerWalkInBodySchema),
	staffQueueController.registerWalkIn,
);

staffQueueRouter.patch(
	ROUTES.ASSIGN_TABLE,
	staffAuthMiddleware,
	validateRequestParams(assignTablesParamsSchema),
	validateRequestBody(assignTablesBodySchema),
	staffQueueController.assignTables,
);

staffQueueRouter.post(
	ROUTES.RING_CUSTOMER,
	staffAuthMiddleware,
	validateRequestParams(ringCustomerParamsSchema),
	staffQueueController.ringCustomer,
);

export { staffQueueRouter };
