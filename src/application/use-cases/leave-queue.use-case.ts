import type { LeaveQueueInputDTO, LeaveQueueOutputDTO } from '@application/dtos/leave-queue.dto.ts';
import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { IQueuePositionRecalculator } from '@application/ports/services/queue-position-recalculator.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import type { ILeaveQueueUseCase } from '@application/ports/use-cases/leave-queue.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import {
	type IQueueRepository,
	QueueCancelReason,
	QueueEntryNotFoundError,
} from '@domain/index.ts';
import { WS_SERVER_EVENTS } from '@shared/constants/websocket.constants.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class LeaveQueueUseCase implements ILeaveQueueUseCase {
	constructor(
		@inject(TYPES.Repositories.QueueRepository)
		private readonly queueRepository: IQueueRepository,
		@inject(TYPES.Services.QueueCacheService)
		private readonly queueCacheService: IQueueCacheService,
		@inject(TYPES.Services.WebSocketBroadcaster)
		private readonly socketBroadcaster: IWebSocketBroadcaster,
		@inject(TYPES.Services.QueuePositionRecalculator)
		private readonly queuePositionRecalculator: IQueuePositionRecalculator,
	) {}

	async execute(input: LeaveQueueInputDTO): Promise<LeaveQueueOutputDTO> {
		const { restaurantId, queueEntryId, userId } = input;

		const queueEntry = await this.queueRepository.findById(queueEntryId);
		if (!queueEntry || queueEntry.restaurantId !== restaurantId) {
			throw new QueueEntryNotFoundError(queueEntryId);
		}

		const previousStatus = queueEntry.status;
		queueEntry.leave(userId);

		const persisted = await this.queueRepository.updateStatusWithHistory({
			queueEntry,
			previousStatus,
			changedBy: userId,
			reason: QueueCancelReason.GUEST_CANCELLED,
			notes: null,
		});

		await this.queueCacheService.removeLiveEntry(queueEntryId);
		await this.queuePositionRecalculator.recalculate(restaurantId);

		const cancelledAtIso = (persisted.cancelledAt ?? new Date()).toISOString();

		const broadcastPayload = {
			event: WS_SERVER_EVENTS.QUEUE_ENTRY_CANCELLED,
			queueEntryId: persisted.id,
			restaurantId: persisted.restaurantId,
			status: persisted.status,
			reason: QueueCancelReason.GUEST_CANCELLED,
			notes: null,
			cancelledAt: cancelledAtIso,
		};

		this.socketBroadcaster.broadcastToRestaurant(
			restaurantId,
			broadcastPayload.event,
			broadcastPayload,
		);
		this.socketBroadcaster.sendToTicket(queueEntryId, broadcastPayload.event, broadcastPayload);

		return {
			queueEntryId: persisted.id,
			restaurantId: persisted.restaurantId,
			status: persisted.status,
			cancelledAt: cancelledAtIso,
		};
	}
}
