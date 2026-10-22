import type { IAssignTableUseCase } from '@application/ports/use-cases/assign-table.use-case.port.ts';
import type { IRegisterQueueUseCase } from '@application/ports/use-cases/register-queue.use-case.port.ts';
import type { IRingCustomerUseCase } from '@application/ports/use-cases/ring-customer.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { RegistrationType } from '@domain/index.ts';
import {
	ApiResponse,
	ERROR_CODES,
	HTTP_STATUS,
	messages,
	QUEUE_MESSAGES,
	sendSuccessResponse,
} from '@shared/index.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import type { AssignTablesBody, AssignTablesParams } from '../validators/assign-table.validator.ts';
import type {
	RegisterWalkInBody,
	RegisterWalkInParams,
} from '../validators/register-walk-in.validator.ts';
import type { RingCustomerParams } from '../validators/ring-customer.validator.ts';

@injectable()
export class StaffQueueController {
	constructor(
		@inject(TYPES.UseCases.RegisterQueueUseCase)
		private readonly registerQueueUseCase: IRegisterQueueUseCase,
		@inject(TYPES.UseCases.AssignTableUseCase)
		private readonly assignTableUseCase: IAssignTableUseCase,
		@inject(TYPES.UseCases.RingCustomerUseCase)
		private readonly ringCustomerUseCase: IRingCustomerUseCase,
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

	assignTables = async (req: Request, res: Response): Promise<void> => {
		const { queueEntryId } = req.params as unknown as AssignTablesParams;
		const { tables } = req.body as AssignTablesBody;

		const restaurantId = req.user?.restaurantId;
		const staffUserId = req.user?.userId;

		if (!restaurantId || !staffUserId) {
			res
				.status(HTTP_STATUS.UNAUTHORIZED)
				.json(
					ApiResponse.error(
						messages.GATEWAY_UNAUTHORIZED,
						ERROR_CODES.UNAUTHORIZED,
						HTTP_STATUS.UNAUTHORIZED,
					),
				);
			return;
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
			res
				.status(HTTP_STATUS.UNAUTHORIZED)
				.json(
					ApiResponse.error(
						messages.GATEWAY_UNAUTHORIZED,
						ERROR_CODES.UNAUTHORIZED,
						HTTP_STATUS.UNAUTHORIZED,
					),
				);
			return;
		}

		const result = await this.ringCustomerUseCase.execute({
			restaurantId,
			queueEntryId,
			staffUserId,
		});

		sendSuccessResponse(res, result, QUEUE_MESSAGES.CUSTOMER_RING_SUCCESS, HTTP_STATUS.OK);
	};
}
