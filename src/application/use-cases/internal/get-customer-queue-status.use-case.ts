import type {
	GetCustomerQueueStatusInputDTO,
	GetCustomerQueueStatusOutputDTO,
} from '@application/dtos/internal/get-customer-queue-status.dto';
import type { IGetCustomerQueueStatusUseCase } from '@application/ports/use-cases/internal/get-customer-queue-status.use-case.port';
import { TYPES } from '@di/types';
import { type IQueueRepository, QueueStatus } from '@domain/index';
import { inject, injectable } from 'inversify';

@injectable()
export class GetCustomerQueueStatusUseCase implements IGetCustomerQueueStatusUseCase {
	constructor(
		@inject(TYPES.Repositories.QueueRepository)
		private readonly queueRepository: IQueueRepository,
	) {}
	async execute(
		input: GetCustomerQueueStatusInputDTO,
	): Promise<GetCustomerQueueStatusOutputDTO | null> {
		console.log(input);
		const queueEntry = await this.queueRepository.findActiveByUserId(input.userId);

		if (!queueEntry) {
			return null;
		}

		if (queueEntry.status !== QueueStatus.WAITING) {
			return null;
		}

		return { restaurantId: queueEntry.restaurantId, queueEntryId: queueEntry.id };
	}
}
