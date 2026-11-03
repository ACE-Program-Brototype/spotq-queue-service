import type { ICancelQueueEntryUseCase } from '@application/ports/use-cases/queue/cancel-queue-entry.use-case.port.ts';
import type { ISeatPartyUseCase } from '@application/ports/use-cases/queue/seat-party.use-case.port.ts';
import type { ISkipPartyUseCase } from '@application/ports/use-cases/queue/skip-party.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { QueueStatus, UnauthorizedError } from '@domain/index.ts';
import type {
	CancelQueueEntryBody,
	CancelQueueEntryParams,
} from '@presentation/http/validators/queue/cancel-queue-entry.validator.ts';
import type {
	SeatPartyBody,
	SeatPartyParams,
} from '@presentation/http/validators/queue/seat-party.validator.ts';
import type {
	SkipPartyBody,
	SkipPartyParams,
} from '@presentation/http/validators/queue/skip-party.validator.ts';
import { HTTP_STATUS, messages, QUEUE_MESSAGES, sendSuccessResponse } from '@shared/index.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';

@injectable()
export class StaffQueueActionsController {
	constructor(
		@inject(TYPES.UseCases.SeatPartyUseCase)
		private readonly seatPartyUseCase: ISeatPartyUseCase,
		@inject(TYPES.UseCases.SkipPartyUseCase)
		private readonly skipPartyUseCase: ISkipPartyUseCase,
		@inject(TYPES.UseCases.CancelQueueEntryUseCase)
		private readonly cancelQueueEntryUseCase: ICancelQueueEntryUseCase,
	) {}

	seatParty = async (req: Request, res: Response): Promise<void> => {
		const { restaurantId, queueEntryId } = req.params as unknown as SeatPartyParams;
		const { tableIds } = req.body as SeatPartyBody;
		const staffUserId = req.user?.userId ?? req.userId;

		if (!staffUserId) {
			throw new UnauthorizedError(messages.GATEWAY_UNAUTHORIZED);
		}

		const result = await this.seatPartyUseCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
			tableIds,
		});

		sendSuccessResponse(res, result, QUEUE_MESSAGES.SEAT_PARTY_SUCCESS, HTTP_STATUS.OK);
	};

	skipParty = async (req: Request, res: Response): Promise<void> => {
		const { restaurantId, queueEntryId } = req.params as unknown as SkipPartyParams;
		const { reason, skipPositions } = req.body as SkipPartyBody;
		const staffUserId = req.user?.userId ?? req.userId;

		if (!staffUserId) {
			throw new UnauthorizedError(messages.GATEWAY_UNAUTHORIZED);
		}

		const result = await this.skipPartyUseCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
			reason,
			skipPositions,
		});

		sendSuccessResponse(res, result, QUEUE_MESSAGES.SKIP_PARTY_SUCCESS, HTTP_STATUS.OK);
	};

	cancelQueueEntry = async (req: Request, res: Response): Promise<void> => {
		const { restaurantId, queueEntryId } = req.params as unknown as CancelQueueEntryParams;
		const { reason, notes } = req.body as CancelQueueEntryBody;
		const staffUserId = req.user?.userId ?? req.userId;

		if (!staffUserId) {
			throw new UnauthorizedError(messages.GATEWAY_UNAUTHORIZED);
		}

		const result = await this.cancelQueueEntryUseCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
			reason,
			notes,
		});

		const message =
			result.status === QueueStatus.NO_SHOW
				? QUEUE_MESSAGES.NO_SHOW_QUEUE_ENTRY_SUCCESS
				: QUEUE_MESSAGES.CANCEL_QUEUE_ENTRY_SUCCESS;

		sendSuccessResponse(res, result, message, HTTP_STATUS.OK);
	};
}
