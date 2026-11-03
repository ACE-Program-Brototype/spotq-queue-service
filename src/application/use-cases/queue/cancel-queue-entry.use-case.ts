import type {
	CancelQueueEntryInputDTO,
	CancelQueueEntryOutputDTO,
} from '@application/dtos/cancel-queue-entry.dto.ts';
import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { IQueuePositionRecalculator } from '@application/ports/services/queue-position-recalculator.port.ts';
import type { IRestaurantServiceClient } from '@application/ports/services/restaurant-service.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import type { ICancelQueueEntryUseCase } from '@application/ports/use-cases/cancel-queue-entry.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { type IQueueRepository, QueueEntryNotFoundError, QueueStatus } from '@domain/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { WS_SERVER_EVENTS } from '@shared/constants/websocket.constants.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class CancelQueueEntryUseCase implements ICancelQueueEntryUseCase {
	constructor(
		@inject(TYPES.Repositories.QueueRepository)
		private readonly queueRepository: IQueueRepository,
		@inject(TYPES.Services.RestaurantServiceClient)
		private readonly restaurantServiceClient: IRestaurantServiceClient,
		@inject(TYPES.Services.QueueCacheService)
		private readonly queueCacheService: IQueueCacheService,
		@inject(TYPES.Services.WebSocketBroadcaster)
		private readonly socketBroadcaster: IWebSocketBroadcaster,
		@inject(TYPES.Services.QueuePositionRecalculator)
		private readonly queuePositionRecalculator: IQueuePositionRecalculator,
	) {}

	async execute(input: CancelQueueEntryInputDTO): Promise<CancelQueueEntryOutputDTO> {
		const { restaurantId, queueEntryId, staffUserId, reason, notes } = input;

		const queueEntry = await this.queueRepository.findById(queueEntryId);
		if (!queueEntry || queueEntry.restaurantId !== restaurantId) {
			throw new QueueEntryNotFoundError(queueEntryId);
		}

		const previousStatus = queueEntry.status;
		const isNoShow = reason.trim().toUpperCase() === QueueStatus.NO_SHOW;
		const targetStatus = isNoShow ? QueueStatus.NO_SHOW : QueueStatus.CANCELLED;

		queueEntry.cancel(targetStatus);

		try {
			const activeAssignments = await this.queueRepository.findActiveTableAssignments(queueEntryId);

			if (activeAssignments.length > 0) {
				const assignmentCount = activeAssignments.length;
				const baseOccupancy = Math.floor(queueEntry.partySize / assignmentCount);
				let remainder = queueEntry.partySize % assignmentCount;

				const releasePayload = activeAssignments.map((a) => {
					const occupancy = baseOccupancy + (remainder > 0 ? 1 : 0);
					if (remainder > 0) {
						remainder--;
					}
					return {
						tableId: a.tableId,
						occupancyToRelease: Math.max(1, occupancy),
					};
				});

				await this.restaurantServiceClient.releaseTables(restaurantId, releasePayload);
				await this.queueRepository.releaseTableAssignments(queueEntryId);
			}
		} catch (err) {
			logger.warn(
				{ err, restaurantId, queueEntryId },
				'Table release coordination completed with non-fatal notice',
			);
		}

		const persisted = await this.queueRepository.updateStatusWithHistory({
			queueEntry,
			previousStatus,
			changedBy: staffUserId,
			reason,
			notes: notes ?? null,
		});

		try {
			await this.queueCacheService.removeLiveEntry(queueEntryId);
		} catch (err) {
			logger.error(
				{ err, queueEntryId },
				'Non-blocking: Failed to remove cancelled entry from live Redis cache',
			);
		}

		try {
			await this.queuePositionRecalculator.recalculate(restaurantId);
		} catch (err) {
			logger.error(
				{ err, restaurantId },
				'Non-blocking: Failed to recalculate queue positions after cancellation',
			);
		}

		const cancelledAtIso = (persisted.cancelledAt ?? new Date()).toISOString();

		const broadcastPayload = {
			event: isNoShow
				? WS_SERVER_EVENTS.QUEUE_ENTRY_NO_SHOW
				: WS_SERVER_EVENTS.QUEUE_ENTRY_CANCELLED,
			queueEntryId: persisted.id,
			restaurantId: persisted.restaurantId,
			status: persisted.status,
			reason,
			notes: notes ?? null,
			cancelledAt: cancelledAtIso,
		};

		try {
			this.socketBroadcaster.broadcastToRestaurant(
				restaurantId,
				broadcastPayload.event,
				broadcastPayload,
			);
			this.socketBroadcaster.sendToTicket(queueEntryId, broadcastPayload.event, broadcastPayload);

			if (isNoShow) {
				this.socketBroadcaster.sendToTicket(
					queueEntryId,
					WS_SERVER_EVENTS.QUEUE_ENTRY_CANCELLED,
					broadcastPayload,
				);
			}
		} catch (err) {
			logger.error(
				{ err, queueEntryId },
				`Non-blocking: Failed to broadcast ${broadcastPayload.event} WebSocket event`,
			);
		}

		return {
			queueEntryId: persisted.id,
			restaurantId: persisted.restaurantId,
			status: persisted.status,
			reason,
			notes: notes ?? null,
			cancelledAt: cancelledAtIso,
		};
	}
}
