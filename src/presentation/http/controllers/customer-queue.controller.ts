import type { IGetQueueEtaUseCase } from '@application/ports/use-cases/get-queue-eta.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { HTTP_STATUS, QUEUE_MESSAGES, sendSuccessResponse } from '@shared/index.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import type { GetEtaParams, GetEtaQuery } from '../validators/get-eta.validator.ts';

@injectable()
export class CustomerQueueController {
	constructor(
		@inject(TYPES.UseCases.GetQueueEtaUseCase)
		private readonly getQueueEtaUseCase: IGetQueueEtaUseCase,
	) {}

	getEta = async (req: Request, res: Response): Promise<void> => {
		const { restaurantId } = req.params as unknown as GetEtaParams;
		const { partySize } = req.query as unknown as GetEtaQuery;

		const result = await this.getQueueEtaUseCase.execute({
			restaurantId,
			partySize: Number(partySize),
		});

		sendSuccessResponse(res, result, QUEUE_MESSAGES.ETA_RETRIEVED_SUCCESS, HTTP_STATUS.OK);
	};
}
