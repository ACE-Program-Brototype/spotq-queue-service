import type { IAssignTableUseCase } from '@application/ports/use-cases/assign-table.use-case.port.ts';
import type { ICancelQueueEntryUseCase } from '@application/ports/use-cases/cancel-queue-entry.use-case.port.ts';
import type { IGetStaffQueueUseCase } from '@application/ports/use-cases/get-staff-queue.use-case.port.ts';
import type { IRegisterQueueUseCase } from '@application/ports/use-cases/register-queue.use-case.port.ts';
import type { IRingCustomerUseCase } from '@application/ports/use-cases/ring-customer.use-case.port.ts';
import type { ISeatPartyUseCase } from '@application/ports/use-cases/seat-party.use-case.port.ts';
import type { ISkipPartyUseCase } from '@application/ports/use-cases/skip-party.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { QueueStatus, RegistrationType, UnauthorizedError } from '@domain/index.ts';
import { HTTP_STATUS, messages, QUEUE_MESSAGES, sendSuccessResponse } from '@shared/index.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import type { AssignTablesBody, AssignTablesParams } from '../validators/assign-table.validator.ts';
import type {
	CancelQueueEntryBody,
	CancelQueueEntryParams,
} from '../validators/cancel-queue-entry.validator.ts';
import type {
	GetStaffQueueParams,
	GetStaffQueueQuery,
} from '../validators/get-staff-queue.validator.ts';
import type {
	RegisterWalkInBody,
	RegisterWalkInParams,
} from '../validators/register-walk-in.validator.ts';
import type { RingCustomerParams } from '../validators/ring-customer.validator.ts';
import type { SeatPartyBody, SeatPartyParams } from '../validators/seat-party.validator.ts';
import type { SkipPartyBody, SkipPartyParams } from '../validators/skip-party.validator.ts';

@injectable()
export class StaffQueueController {
	constructor(
		@inject(TYPES.UseCases.RegisterQueueUseCase)
		private readonly registerQueueUseCase: IRegisterQueueUseCase,
		@inject(TYPES.UseCases.AssignTableUseCase)
		private readonly assignTableUseCase: IAssignTableUseCase,
		@inject(TYPES.UseCases.RingCustomerUseCase)
		private readonly ringCustomerUseCase: IRingCustomerUseCase,
		@inject(TYPES.UseCases.GetStaffQueueUseCase)
		private readonly getStaffQueueUseCase: IGetStaffQueueUseCase,
		@inject(TYPES.UseCases.SeatPartyUseCase)
		private readonly seatPartyUseCase: ISeatPartyUseCase,
		@inject(TYPES.UseCases.SkipPartyUseCase)
		private readonly skipPartyUseCase: ISkipPartyUseCase,
		@inject(TYPES.UseCases.CancelQueueEntryUseCase)
		private readonly cancelQueueEntryUseCase: ICancelQueueEntryUseCase,
	) {}

	getLiveQueue = async (req: Request, res: Response): Promise<void> => {
		const { restaurantId } = req.params as unknown as GetStaffQueueParams;
		const { status, partySizeBucket } = req.query as unknown as GetStaffQueueQuery;

		const result = await this.getStaffQueueUseCase.execute({
			restaurantId,
			status,
			partySizeBucket,
		});

		sendSuccessResponse(res, result, QUEUE_MESSAGES.QUEUE_RETRIEVED_SUCCESS, HTTP_STATUS.OK);
	};

	registerWalkIn = async (req: Request, res: Response): Promise<void> => {
		const { restaurantId } = req.params as unknown as RegisterWalkInParams;
		const { guestName, guestPhone, partySize, specialNotes } = req.body as RegisterWalkInBody;
		const staffUserId = req.user?.userId;

		if (!staffUserId) {
			throw new UnauthorizedError(messages.GATEWAY_UNAUTHORIZED);
		}

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

	assignTables = async (req: Request, res: Response): Promise<void> => {
		const { queueEntryId } = req.params as unknown as AssignTablesParams;
		const { tables } = req.body as AssignTablesBody;

		const restaurantId = req.user?.restaurantId;
		const staffUserId = req.user?.userId;

		if (!restaurantId || !staffUserId) {
			throw new UnauthorizedError(messages.GATEWAY_UNAUTHORIZED);
		}

		const result = await this.assignTableUseCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
			tables,
		});

		sendSuccessResponse(res, result, QUEUE_MESSAGES.TABLE_ASSIGN_SUCCESS, HTTP_STATUS.OK);
	};

	ringCustomer = async (req: Request, res: Response): Promise<void> => {
		const { queueEntryId } = req.params as unknown as RingCustomerParams;
		const restaurantId = req.user?.restaurantId;
		const staffUserId = req.user?.userId;

		if (!restaurantId || !staffUserId) {
			throw new UnauthorizedError(messages.GATEWAY_UNAUTHORIZED);
		}

		const result = await this.ringCustomerUseCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
		});

		sendSuccessResponse(res, result, QUEUE_MESSAGES.CUSTOMER_RING_SUCCESS, HTTP_STATUS.OK);
	};

	seatParty = async (req: Request, res: Response): Promise<void> => {
		const { restaurantId, queueEntryId } = req.params as unknown as SeatPartyParams;
		const { tableIds } = req.body as SeatPartyBody;
		const staffUserId = req.user?.userId;

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
		const staffUserId = req.user?.userId;

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
		const staffUserId = req.user?.userId;

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
