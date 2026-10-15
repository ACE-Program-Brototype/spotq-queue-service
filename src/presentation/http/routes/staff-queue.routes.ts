import { staffQueueController } from '@di/controllers.resolutions.ts';
import {
	staffAuthMiddleware,
	validateBody,
	validateParams,
} from '@presentation/http/middleware/index.ts';
import {
	registerWalkInBodySchema,
	registerWalkInParamsSchema,
} from '@presentation/http/validators/register-walk-in.validator.ts';
import { ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';

/**
 * Express router handling staff queue management endpoints.
 *
 * Controllers are injected from the Inversify IoC container.
 */
const staffQueueRouter = Router();

staffQueueRouter.post(
	ROUTES.REGISTER_WALK_IN,
	staffAuthMiddleware,
	validateParams(registerWalkInParamsSchema),
	validateBody(registerWalkInBodySchema),
	staffQueueController.registerWalkIn,
);

export { staffQueueRouter };
