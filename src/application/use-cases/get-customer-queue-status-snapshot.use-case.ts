import type {
	GetCustomerQueueStatusSnapshotInputDTO,
	GetCustomerQueueStatusSnapshotOutputDTO,
} from '@application/dtos/get-customer-queue-status-snapshot.dto.ts';
import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { IRestaurantServiceClient } from '@application/ports/services/restaurant-service.port.ts';
import type { IGetCustomerQueueStatusSnapshotUseCase } from '@application/ports/use-cases/get-customer-queue-status-snapshot.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import {
	type IQueueRepository,
	QueueEntryNotFoundError,
	QueueStatus,
	RegistrationType,
	WalkInTicketNotAccessibleError,
} from '@domain/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetCustomerQueueStatusSnapshotUseCase
	implements IGetCustomerQueueStatusSnapshotUseCase
{
	constructor(
		@inject(TYPES.Repositories.QueueRepository)
		private readonly queueRepository: IQueueRepository,
		@inject(TYPES.Services.RestaurantServiceClient)
		private readonly restaurantServiceClient: IRestaurantServiceClient,
		@inject(TYPES.Services.QueueCacheService)
		private readonly queueCacheService: IQueueCacheService,
	) {}

	async execute(
		input: GetCustomerQueueStatusSnapshotInputDTO,
	): Promise<GetCustomerQueueStatusSnapshotOutputDTO> {
		const { restaurantId, queueEntryId } = input;

		const snapshot = await this.queueRepository.getCustomerQueueEntrySnapshot?.(
			restaurantId,
			queueEntryId,
		);

		if (!snapshot) {
			throw new QueueEntryNotFoundError(queueEntryId);
		}

		const { entry, totalWaitingParties, assignedTableId } = snapshot;

		if (entry.registrationType === RegistrationType.WALK_IN) {
			throw new WalkInTicketNotAccessibleError(queueEntryId);
		}

		let restaurantName = '';
		try {
			const restaurantStatus = await this.restaurantServiceClient.getRestaurantStatus(restaurantId);
			restaurantName = restaurantStatus.restaurantName;
		} catch (error) {
			logger.warn(
				{ err: error, restaurantId },
				'Non-blocking: Failed to retrieve restaurant name from restaurant service for status snapshot',
			);
		}

		let resolvedPosition: number | null = null;

		if (entry.status === QueueStatus.WAITING) {
			resolvedPosition = snapshot.position;

			if (resolvedPosition !== null) {
				try {
					await this.queueCacheService.cachePosition?.(entry.id, resolvedPosition);
				} catch (err) {
					logger.warn({ err, queueEntryId: entry.id }, 'Failed to cache position in Redis');
				}
			}
		} else {
			resolvedPosition = null;
			try {
				await this.queueCacheService.invalidatePosition?.(entry.id);
			} catch (err) {
				logger.warn(
					{ err, queueEntryId: entry.id },
					'Failed to invalidate position cache for non-waiting entry',
				);
			}
		}

		const estimatedWaitMinutes =
			entry.status === QueueStatus.WAITING ? (entry.estimatedWaitMinutes ?? 0) : null;

		const responseDeadline = entry.calculateResponseDeadline()?.toISOString() ?? null;

		return {
			queueEntryId: entry.id,
			restaurantId: entry.restaurantId,
			restaurantName,
			queueNumber: entry.queueNumber,
			guestName: entry.guestName,
			partySize: entry.partySize,
			position: resolvedPosition,
			totalWaitingParties,
			estimatedWaitMinutes,
			status: entry.status,
			registrationType: entry.registrationType,
			joinedAt: entry.joinedAt.toISOString(),
			updatedAt: entry.updatedAt.toISOString(),
			lastRingAt: entry.lastRingedAt ? entry.lastRingedAt.toISOString() : null,
			responseDeadline,
			assignedTableId,
		};
	}
}
