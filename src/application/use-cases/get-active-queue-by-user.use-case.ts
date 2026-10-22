import type {
	GetActiveQueueByUserInputDto,
	GetActiveQueueByUserResponseDto,
} from '@application/dtos/get-active-queue-by-user.dto.ts';
import type { IGetActiveQueueByUserUseCase } from '@application/ports/use-cases/get-active-queue-by-user.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import type { IQueueRepository } from '@domain/repositories/queue.repository.interface.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetActiveQueueByUserUseCase implements IGetActiveQueueByUserUseCase {
	constructor(
		@inject(TYPES.Repositories.QueueRepository)
		private readonly queueRepository: IQueueRepository,
	) {}

	public async execute(
		input: GetActiveQueueByUserInputDto,
	): Promise<GetActiveQueueByUserResponseDto> {
		const activeEntry = await this.queueRepository.findActiveByUserId(
			input.restaurantId,
			input.userId,
		);

		if (!activeEntry) {
			return {
				hasActiveQueue: false,
				queueEntry: null,
			};
		}

		return {
			hasActiveQueue: true,
			queueEntry: {
				queueEntryId: activeEntry.id,
				restaurantId: activeEntry.restaurantId,
				userId: activeEntry.userId ?? null,
				queueNumber: activeEntry.queueNumber,
				partySize: activeEntry.partySize,
				status: activeEntry.status,
				position: activeEntry.position,
				estimatedWaitMinutes: activeEntry.estimatedWaitMinutes,
				joinedAt: activeEntry.joinedAt,
			},
		};
	}
}
