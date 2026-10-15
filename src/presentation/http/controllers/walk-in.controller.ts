import type { IRegisterWalkInUseCase } from '@application/ports/use-cases/register-walk-in.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { HTTP_STATUS, QUEUE_MESSAGES, sendSuccessResponse } from '@shared/index.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import type {
	RegisterWalkInBody,
	RegisterWalkInParams,
} from '../validators/register-walk-in.validator.ts';

/**
 * Controller handling staff-facing walk-in queue registrations.
 *
 * Express 5 Note:
 * In Express 5, async handler errors and rejected Promises are automatically forwarded
 * to the error-handling middleware without requiring repetitive try/catch boilerplate.
 */
@injectable()
export class WalkInController {
	constructor(
		@inject(TYPES.UseCases.RegisterWalkInUseCase)
		private readonly registerWalkInUseCase: IRegisterWalkInUseCase,
	) {}

	/**
	 * Registers a walk-in party directly into the restaurant queue.
	 *
	 * @route POST /api/v1/staff/restaurants/:restaurantId/queue/walk-in
	 * @param req - Express request containing restaurantId parameter and guest party body
	 * @param res - Express response returning 201 Created and entry details
	 */
	registerWalkIn = async (req: Request, res: Response): Promise<void> => {
		const { restaurantId } = req.params as unknown as RegisterWalkInParams;
		const { guestName, guestPhone, partySize, specialNotes } = req.body as RegisterWalkInBody;
		const staffUserId = req.userId || req.user?.userId || 'unknown-staff';

		const result = await this.registerWalkInUseCase.execute({
			restaurantId,
			staffUserId,
			guestName,
			guestPhone,
			partySize,
			specialNotes,
		});

		sendSuccessResponse(res, result, QUEUE_MESSAGES.WALK_IN_REGISTER_SUCCESS, HTTP_STATUS.CREATED);
	};
}
