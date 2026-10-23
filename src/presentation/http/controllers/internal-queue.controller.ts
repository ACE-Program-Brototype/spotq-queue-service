import type { IGetActiveQueueByUserUseCase } from '@application/ports/use-cases/get-active-queue-by-user.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { HTTP_STATUS, QUEUE_MESSAGES, sendSuccessResponse } from '@shared/index.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import type { GetUserActiveQueueParams } from '../validators/get-user-active-queue.validator.ts';

@injectable()
export class InternalQueueController {
	constructor(
		@inject(TYPES.UseCases.GetActiveQueueByUserUseCase)
		private readonly getActiveQueueByUserUseCase: IGetActiveQueueByUserUseCase,
	) {}

	getActiveQueueByUser = async (req: Request, res: Response): Promise<void> => {
		const { restaurantId, userId } = req.params as unknown as GetUserActiveQueueParams;

		const result = await this.getActiveQueueByUserUseCase.execute({
			restaurantId,
			userId,
		});

		sendSuccessResponse(res, result, QUEUE_MESSAGES.ACTIVE_QUEUE_CHECK_SUCCESS, HTTP_STATUS.OK);
	};
}
