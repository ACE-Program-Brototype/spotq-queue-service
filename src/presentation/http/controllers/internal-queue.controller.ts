import type { IGetActiveQueueByUserUseCase } from '@application/ports/use-cases/get-active-queue-by-user.use-case.port.ts';
import type { IGetCustomerQueueStatusUseCase } from '@application/ports/use-cases/internal/get-customer-queue-status.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { HTTP_STATUS, messages, QUEUE_MESSAGES, sendSuccessResponse } from '@shared/index.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import type { GetUserActiveQueueParams } from '../validators/get-user-active-queue.validator.ts';
import type { GetCustomerQueueStatusBody } from '../validators/internal/get-customer-queue-status.validator.ts';

@injectable()
export class InternalQueueController {
	constructor(
		@inject(TYPES.UseCases.GetActiveQueueByUserUseCase)
		private readonly getActiveQueueByUserUseCase: IGetActiveQueueByUserUseCase,
		@inject(TYPES.UseCases.Internal.GetCustomerQueueStatusUseCase)
		private readonly getCustomerQueueStatusUseCase: IGetCustomerQueueStatusUseCase,
	) {}

	getActiveQueueByUser = async (req: Request, res: Response): Promise<void> => {
		const { restaurantId, userId } = req.params as unknown as GetUserActiveQueueParams;

		const result = await this.getActiveQueueByUserUseCase.execute({
			restaurantId,
			userId,
		});

		sendSuccessResponse(res, result, QUEUE_MESSAGES.ACTIVE_QUEUE_CHECK_SUCCESS, HTTP_STATUS.OK);
	};

	getCustomerQueueStatus = async (req: Request, res: Response): Promise<void> => {
		const { userId } = req.body as GetCustomerQueueStatusBody;

		const result = await this.getCustomerQueueStatusUseCase.execute({ userId });

		sendSuccessResponse(res, result, messages.CUSTOMER_QUEUE_STATUS_FETCH, HTTP_STATUS.OK);
	};
}
