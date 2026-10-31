import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { IEtaService } from '@application/ports/services/eta-service.port.ts';
import type {
	IQueuePositionRecalculator,
	PositionRecalculationResult,
} from '@application/ports/services/queue-position-recalculator.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import { TYPES } from '@di/types.ts';
import type { IQueueRepository } from '@domain/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { WS_SERVER_EVENTS } from '@shared/constants/websocket.constants.ts';
import { inject, injectable } from 'inversify';

interface PositionDelta {
	id: string;
	oldPosition: number | null;
	newPosition: number;
	oldEta: number | null;
	newEta: number;
	partySize: number;
}

@injectable()
export class QueuePositionRecalculator implements IQueuePositionRecalculator {
	constructor(
		@inject(TYPES.Repositories.QueueRepository)
		private readonly queueRepository: IQueueRepository,
		@inject(TYPES.Services.EtaService)
		private readonly etaService: IEtaService,
		@inject(TYPES.Services.QueueCacheService)
		private readonly queueCacheService: IQueueCacheService,
		@inject(TYPES.Services.WebSocketBroadcaster)
		private readonly socketBroadcaster: IWebSocketBroadcaster,
	) {}

	async recalculate(restaurantId: string): Promise<PositionRecalculationResult> {
		const activeEntries = await this.queueRepository.findActiveEntries(restaurantId);

		if (activeEntries.length === 0) {
			return { affectedCount: 0, updatedEntryIds: [] };
		}

		let runningPeopleAhead = 0;
		const deltas: PositionDelta[] = [];

		for (let i = 0; i < activeEntries.length; i++) {
			const entry = activeEntries[i];
			const newPosition = i + 1;
			const predictedEta = await this.etaService.predictEta(
				restaurantId,
				runningPeopleAhead,
				entry.partySize,
			);

			const positionChanged = entry.position !== newPosition;
			const etaChanged = entry.estimatedWaitMinutes !== predictedEta;

			if (positionChanged || etaChanged) {
				deltas.push({
					id: entry.id,
					oldPosition: entry.position,
					newPosition,
					oldEta: entry.estimatedWaitMinutes,
					newEta: predictedEta,
					partySize: entry.partySize,
				});
				entry.updatePosition(newPosition, predictedEta);
			}

			runningPeopleAhead += entry.partySize;
		}

		if (deltas.length === 0) {
			return { affectedCount: 0, updatedEntryIds: [] };
		}

		await this.queueRepository.batchUpdatePositions(
			deltas.map((d) => ({
				id: d.id,
				position: d.newPosition,
				estimatedWaitMinutes: d.newEta,
			})),
		);

		await Promise.allSettled(
			deltas.map(async (d) => {
				try {
					await this.queueCacheService.saveLiveEntry(d.id, restaurantId, d.newPosition, d.newEta);
				} catch (err) {
					logger.error(
						{ err, queueEntryId: d.id },
						'Non-blocking: Failed to update live cache during position recalculation',
					);
				}
			}),
		);

		for (const delta of deltas) {
			const payload = {
				event: WS_SERVER_EVENTS.QUEUE_POSITION_UPDATED,
				queueEntryId: delta.id,
				restaurantId,
				position: delta.newPosition,
				estimatedWaitMinutes: delta.newEta,
			};

			try {
				this.socketBroadcaster.sendToTicket(
					delta.id,
					WS_SERVER_EVENTS.QUEUE_POSITION_UPDATED,
					payload,
				);
			} catch (err) {
				logger.error(
					{ err, queueEntryId: delta.id },
					`Non-blocking: Failed to broadcast ${WS_SERVER_EVENTS.QUEUE_POSITION_UPDATED} to ticket room`,
				);
			}
		}

		try {
			this.socketBroadcaster.broadcastToRestaurant(
				restaurantId,
				WS_SERVER_EVENTS.QUEUE_POSITION_UPDATED,
				{
					event: WS_SERVER_EVENTS.QUEUE_POSITION_UPDATED,
					restaurantId,
					updatedEntries: deltas.map((d) => ({
						queueEntryId: d.id,
						position: d.newPosition,
						estimatedWaitMinutes: d.newEta,
					})),
				},
			);
		} catch (err) {
			logger.error(
				{ err, restaurantId },
				`Non-blocking: Failed to broadcast ${WS_SERVER_EVENTS.QUEUE_POSITION_UPDATED} to restaurant room`,
			);
		}

		return {
			affectedCount: deltas.length,
			updatedEntryIds: deltas.map((d) => d.id),
		};
	}
}
