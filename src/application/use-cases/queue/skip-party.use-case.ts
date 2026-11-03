import type { SkipPartyInputDTO, SkipPartyOutputDTO } from '@application/dtos/skip-party.dto.ts';
import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { IQueuePositionRecalculator } from '@application/ports/services/queue-position-recalculator.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import type { ISkipPartyUseCase } from '@application/ports/use-cases/skip-party.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import {
	type IQueueRepository,
	QueueEntryNotFoundError,
	QueueEntryNotWaitingError,
	QueueStatus,
} from '@domain/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { WS_SERVER_EVENTS } from '@shared/constants/websocket.constants.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class SkipPartyUseCase implements ISkipPartyUseCase {
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

	async execute(input: SkipPartyInputDTO): Promise<SkipPartyOutputDTO> {
		const { restaurantId, queueEntryId, staffUserId, reason, skipPositions } = input;

		const queueEntry = await this.queueRepository.findById(queueEntryId);
		if (!queueEntry || queueEntry.restaurantId !== restaurantId) {
			throw new QueueEntryNotFoundError(queueEntryId);
		}

		if (queueEntry.status !== QueueStatus.WAITING) {
			throw new QueueEntryNotWaitingError(queueEntryId, queueEntry.status);
		}

		const previousStatus = queueEntry.status;

		if (skipPositions && skipPositions > 0) {
			const activeEntries = await this.queueRepository.findActiveEntries(restaurantId);
			const currentIndex = activeEntries.findIndex((e) => e.id === queueEntryId);

			if (currentIndex !== -1) {
				const targetIndex = Math.min(currentIndex + skipPositions, activeEntries.length - 1);
				const [skippedEntry] = activeEntries.splice(currentIndex, 1);
				activeEntries.splice(targetIndex, 0, skippedEntry);

				queueEntry.updatePosition(targetIndex + 1);

				const updates = activeEntries.map((entry, idx) => ({
					id: entry.id,
					position: idx + 1,
				}));
				await this.queueRepository.batchUpdatePositions(updates);

				await this.queueRepository.updateStatusWithHistory({
					queueEntry,
					previousStatus,
					changedBy: staffUserId,
					reason: `${reason} (shifted by ${skipPositions} positions)`,
				});

				try {
					await this.queuePositionRecalculator.recalculate(restaurantId);
				} catch (err) {
					logger.error(
						{ err, restaurantId },
						'Non-blocking: Failed to recalculate queue positions after skip reordering',
					);
				}

				const broadcastPayload = {
					event: WS_SERVER_EVENTS.QUEUE_ENTRY_SKIPPED,
					queueEntryId: queueEntry.id,
					restaurantId: queueEntry.restaurantId,
					status: queueEntry.status,
					reason: `${reason} (shifted by ${skipPositions} positions)`,
					position: targetIndex + 1,
				};

				try {
					this.socketBroadcaster.broadcastToRestaurant(
						restaurantId,
						WS_SERVER_EVENTS.QUEUE_ENTRY_SKIPPED,
						broadcastPayload,
					);
					this.socketBroadcaster.sendToTicket(
						queueEntryId,
						WS_SERVER_EVENTS.QUEUE_ENTRY_SKIPPED,
						broadcastPayload,
					);
				} catch (err) {
					logger.error(
						{ err, queueEntryId },
						`Non-blocking: Failed to broadcast ${WS_SERVER_EVENTS.QUEUE_ENTRY_SKIPPED} WebSocket event`,
					);
				}

				return {
					queueEntryId: queueEntry.id,
					restaurantId: queueEntry.restaurantId,
					status: queueEntry.status,
					reason,
					position: targetIndex + 1,
				};
			}
		}

		queueEntry.skip();

		const persisted = await this.queueRepository.updateStatusWithHistory({
			queueEntry,
			previousStatus,
			changedBy: staffUserId,
			reason,
		});

		try {
			await this.queueCacheService.removeLiveEntry(queueEntryId);
		} catch (err) {
			logger.error(
				{ err, queueEntryId },
				'Non-blocking: Failed to remove skipped entry from live Redis cache',
			);
		}

		try {
			await this.queuePositionRecalculator.recalculate(restaurantId);
		} catch (err) {
			logger.error(
				{ err, restaurantId },
				'Non-blocking: Failed to recalculate queue positions after skipping party',
			);
		}

		const broadcastPayload = {
			event: WS_SERVER_EVENTS.QUEUE_ENTRY_SKIPPED,
			queueEntryId: persisted.id,
			restaurantId: persisted.restaurantId,
			status: persisted.status,
			reason,
		};

		try {
			this.socketBroadcaster.broadcastToRestaurant(
				restaurantId,
				WS_SERVER_EVENTS.QUEUE_ENTRY_SKIPPED,
				broadcastPayload,
			);
			this.socketBroadcaster.sendToTicket(
				queueEntryId,
				WS_SERVER_EVENTS.QUEUE_ENTRY_SKIPPED,
				broadcastPayload,
			);
		} catch (err) {
			logger.error(
				{ err, queueEntryId },
				`Non-blocking: Failed to broadcast ${WS_SERVER_EVENTS.QUEUE_ENTRY_SKIPPED} WebSocket event`,
			);
		}

		return {
			queueEntryId: persisted.id,
			restaurantId: persisted.restaurantId,
			status: persisted.status,
			reason,
			position: null,
		};
	}
}
