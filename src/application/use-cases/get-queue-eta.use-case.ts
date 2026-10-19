import type {
	GetQueueEtaInputDTO,
	GetQueueEtaOutputDTO,
} from '@application/dtos/get-queue-eta.dto.ts';
import { validateRestaurantActiveSubscription } from '@application/helpers/index.ts';
import type { IEtaService } from '@application/ports/services/eta-service.port.ts';
import type { IRestaurantServiceClient } from '@application/ports/services/restaurant-service.port.ts';
import type { IGetQueueEtaUseCase } from '@application/ports/use-cases/get-queue-eta.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import type { IQueueRepository } from '@domain/index.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetQueueEtaUseCase implements IGetQueueEtaUseCase {
	constructor(
		@inject(TYPES.Repositories.QueueRepository)
		private readonly queueRepository: IQueueRepository,
		@inject(TYPES.Services.RestaurantServiceClient)
		private readonly restaurantServiceClient: IRestaurantServiceClient,
		@inject(TYPES.Services.EtaService)
		private readonly etaService: IEtaService,
	) {}

	async execute(input: GetQueueEtaInputDTO): Promise<GetQueueEtaOutputDTO> {
		const { restaurantId, partySize } = input;

		const restaurantStatus = await this.restaurantServiceClient.getRestaurantStatus(restaurantId);

		validateRestaurantActiveSubscription(restaurantStatus);

		const { queueDepth, totalPeopleAhead } =
			await this.queueRepository.getActiveQueueMetrics(restaurantId);

		if (queueDepth === 0 || totalPeopleAhead === 0) {
			return {
				restaurantId,
				partySize,
				estimatedWaitMinutes: 0,
				queueDepth: 0,
				calculatedAt: new Date().toISOString(),
			};
		}

		const estimatedWaitMinutes = await this.etaService.predictEta(
			restaurantId,
			totalPeopleAhead,
			partySize,
		);

		return {
			restaurantId,
			partySize,
			estimatedWaitMinutes,
			queueDepth,
			calculatedAt: new Date().toISOString(),
		};
	}
}
