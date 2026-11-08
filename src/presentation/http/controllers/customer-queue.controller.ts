import type { IGetCustomerQueueStatusSnapshotUseCase } from '@application/ports/use-cases/get-customer-queue-status-snapshot.use-case.port.ts';
import type { IGetQueueEtaUseCase } from '@application/ports/use-cases/get-queue-eta.use-case.port.ts';
import type { IRegisterQueueUseCase } from '@application/ports/use-cases/register-queue.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { RegistrationType } from '@domain/index.ts';
import {
	HTTP_STATUS,
	QUEUE_MESSAGES,
	sendSuccessResponse,
	WEBSOCKET_PATHS,
	WEBSOCKET_ROOMS,
	WS_CLIENT_EVENTS,
	WS_SERVER_EVENTS,
} from '@shared/index.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import type {
	GetCustomerQueueStatusParams,
	GetCustomerQueueStatusQuery,
} from '../validators/get-customer-queue-status.validator.ts';
import type { GetEtaParams, GetEtaQuery } from '../validators/get-eta.validator.ts';
import type { JoinQueueBody, JoinQueueParams } from '../validators/join-queue.validator.ts';

@injectable()
export class CustomerQueueController {
	constructor(
		@inject(TYPES.UseCases.GetQueueEtaUseCase)
		private readonly getQueueEtaUseCase: IGetQueueEtaUseCase,
		@inject(TYPES.UseCases.RegisterQueueUseCase)
		private readonly registerQueueUseCase: IRegisterQueueUseCase,
		@inject(TYPES.UseCases.GetCustomerQueueStatusSnapshotUseCase)
		private readonly getCustomerQueueStatusSnapshotUseCase: IGetCustomerQueueStatusSnapshotUseCase,
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

	getQueueStatus = async (req: Request, res: Response): Promise<void> => {
		const { restaurantId } = req.params as unknown as GetCustomerQueueStatusParams;
		const { queueEntryId } = req.query as unknown as GetCustomerQueueStatusQuery;

		const result = await this.getCustomerQueueStatusSnapshotUseCase.execute({
			restaurantId,
			queueEntryId,
		});

		sendSuccessResponse(res, result, QUEUE_MESSAGES.CUSTOMER_QUEUE_STATUS_FETCH, HTTP_STATUS.OK);
	};

	joinQueue = async (req: Request, res: Response): Promise<void> => {
		const { restaurantId } = req.params as unknown as JoinQueueParams;
		const { guestName, guestPhone, partySize, specialNotes, fid } = req.body as JoinQueueBody;
		const userId = req.user?.userId ?? req.userId;

		const result = await this.registerQueueUseCase.execute({
			restaurantId,
			userId,
			guestName,
			guestPhone,
			partySize,
			specialNotes,
			fid,
			registrationType: RegistrationType.ONLINE,
		});

		const responsePayload = {
			...result,
			websocket: {
				path: WEBSOCKET_PATHS.GATEWAY_QUEUES,
				room: WEBSOCKET_ROOMS.ticket(result.queueEntryId),
				ticketId: result.queueEntryId,
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
