import type { IGetQueueEtaUseCase } from '@application/ports/use-cases/get-queue-eta.use-case.port.ts';
import type { IRegisterQueueUseCase } from '@application/ports/use-cases/register-queue.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { RegistrationType } from '@domain/index.ts';
import {
	HTTP_STATUS,
	QUEUE_MESSAGES,
	sendSuccessResponse,
	WEBSOCKET_ROOMS,
	WS_CLIENT_EVENTS,
	WS_SERVER_EVENTS,
} from '@shared/index.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import type { GetEtaParams, GetEtaQuery } from '../validators/get-eta.validator.ts';
import type { JoinQueueBody, JoinQueueParams } from '../validators/join-queue.validator.ts';

@injectable()
export class CustomerQueueController {
	constructor(
		@inject(TYPES.UseCases.GetQueueEtaUseCase)
		private readonly getQueueEtaUseCase: IGetQueueEtaUseCase,
		@inject(TYPES.UseCases.RegisterQueueUseCase)
		private readonly registerQueueUseCase: IRegisterQueueUseCase,
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

	joinQueue = async (req: Request, res: Response): Promise<void> => {
		const { restaurantId } = req.params as unknown as JoinQueueParams;
		const { guestName, guestPhone, partySize, specialNotes, fcmDeviceToken } =
			req.body as JoinQueueBody;
		const userId = req.userId || req.user?.userId;

		const result = await this.registerQueueUseCase.execute({
			restaurantId,
			userId,
			guestName,
			guestPhone,
			partySize,
			specialNotes,
			fcmDeviceToken,
			registrationType: RegistrationType.ONLINE,
		});

		const responsePayload = {
			...result,
			websocket: {
				path: '/ws/queues',
				room: WEBSOCKET_ROOMS.ticket(result.queueEntryId),
				subscribeEvent: WS_CLIENT_EVENTS.JOIN_TICKET,
				updateEvent: WS_SERVER_EVENTS.QUEUE_POSITION_UPDATED,
			},
		};

		sendSuccessResponse(
			res,
			responsePayload,
			QUEUE_MESSAGES.JOIN_QUEUE_SUCCESS,
			HTTP_STATUS.CREATED,
		);
	};
}
