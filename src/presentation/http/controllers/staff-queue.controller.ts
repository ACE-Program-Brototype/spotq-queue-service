import type { IRegisterQueueUseCase } from '@application/ports/use-cases/register-queue.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { RegistrationType } from '@domain/index.ts';
import { HTTP_STATUS, QUEUE_MESSAGES, sendSuccessResponse } from '@shared/index.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import type {
	RegisterWalkInBody,
	RegisterWalkInParams,
} from '../validators/register-walk-in.validator.ts';

@injectable()
export class StaffQueueController {
	constructor(
		@inject(TYPES.UseCases.RegisterQueueUseCase)
		private readonly registerQueueUseCase: IRegisterQueueUseCase,
	) {}

	registerWalkIn = async (req: Request, res: Response): Promise<void> => {
		const { restaurantId } = req.params as unknown as RegisterWalkInParams;
		const { guestName, guestPhone, partySize, specialNotes } = req.body as RegisterWalkInBody;
		const staffUserId = req.userId || req.user?.userId || 'unknown-staff';

		const result = await this.registerQueueUseCase.execute({
			restaurantId,
			staffUserId,
			guestName,
			guestPhone,
			partySize,
			specialNotes,
			registrationType: RegistrationType.WALK_IN,
		});

		sendSuccessResponse(res, result, QUEUE_MESSAGES.WALK_IN_REGISTER_SUCCESS, HTTP_STATUS.CREATED);
	};
}
