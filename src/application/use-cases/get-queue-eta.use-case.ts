import type {
	GetQueueEtaInputDTO,
	GetQueueEtaOutputDTO,
} from '@application/dtos/get-queue-eta.dto.ts';
import type { IEtaService } from '@application/ports/services/eta-service.port.ts';
import type { IRestaurantServiceClient } from '@application/ports/services/restaurant-service.port.ts';
import type { IGetQueueEtaUseCase } from '@application/ports/use-cases/get-queue-eta.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import {
	type IQueueRepository,
	RestaurantBlockedError,
	SubscriptionRequiredError,
} from '@domain/index.ts';
import { SUBSCRIPTION_PLAN } from '@shared/index.ts';
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

		if (restaurantStatus.isBlocked) {
			throw new RestaurantBlockedError(restaurantId, restaurantStatus.blockReason);
		}

		if (
			!restaurantStatus.isSubscriptionActive ||
			restaurantStatus.subscriptionPlanCode !== SUBSCRIPTION_PLAN.QUEUE_PRO
		) {
			throw new SubscriptionRequiredError(restaurantId, restaurantStatus.subscriptionPlanCode);
		}

		const [queueDepth, totalPeopleAhead] = await Promise.all([
			this.queueRepository.countActiveAhead(restaurantId),
			this.queueRepository.sumPartySizeActiveAhead(restaurantId),
		]);

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
