import type {
	SeatPartyInputDTO,
	SeatPartyOutputDTO,
} from '@application/dtos/queue/seat-party.dto.ts';
import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { IQueuePositionRecalculator } from '@application/ports/services/queue-position-recalculator.port.ts';
import type { IRestaurantServiceClient } from '@application/ports/services/restaurant-service.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import type { ISeatPartyUseCase } from '@application/ports/use-cases/queue/seat-party.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { type IQueueRepository, QueueEntryNotFoundError } from '@domain/index.ts';
import { WS_SERVER_EVENTS } from '@shared/constants/websocket.constants.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class SeatPartyUseCase implements ISeatPartyUseCase {
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

	async execute(input: SeatPartyInputDTO): Promise<SeatPartyOutputDTO> {
		const { restaurantId, queueEntryId, staffUserId, tableIds } = input;

		const queueEntry = await this.queueRepository.findById(queueEntryId);
		if (!queueEntry || queueEntry.restaurantId !== restaurantId) {
			throw new QueueEntryNotFoundError(queueEntryId);
		}

		const previousStatus = queueEntry.status;
		queueEntry.seat();

		const tableCount = tableIds.length;
		const baseCount = Math.floor(queueEntry.partySize / tableCount);
		let remainder = queueEntry.partySize % tableCount;

		const assignmentPayload = tableIds.map((tableId) => {
			const count = baseCount + (remainder > 0 ? 1 : 0);
			if (remainder > 0) {
				remainder--;
			}
			return { tableId, count: Math.max(1, count) };
		});

		await this.restaurantServiceClient.assignTables(restaurantId, assignmentPayload);

		const persisted = await this.queueRepository.assignTablesWithHistory(
			queueEntry,
			tableIds,
			staffUserId,
			previousStatus,
		);

		await this.queueCacheService.removeLiveEntry(queueEntryId);
		await this.queuePositionRecalculator.recalculate(restaurantId);

		const seatedAtIso = (persisted.seatedAt ?? new Date()).toISOString();

		const broadcastPayload = {
			event: WS_SERVER_EVENTS.QUEUE_ENTRY_SEATED,
			queueEntryId: persisted.id,
			restaurantId: persisted.restaurantId,
			status: persisted.status,
			tableIds,
			seatedAt: seatedAtIso,
		};

		this.socketBroadcaster.broadcastToRestaurant(
			restaurantId,
			WS_SERVER_EVENTS.QUEUE_ENTRY_SEATED,
			broadcastPayload,
		);
		this.socketBroadcaster.sendToTicket(
			queueEntryId,
			WS_SERVER_EVENTS.QUEUE_ENTRY_SEATED,
			broadcastPayload,
		);

		return {
			queueEntryId: persisted.id,
			restaurantId: persisted.restaurantId,
			status: persisted.status,
			tableIds,
			seatedAt: seatedAtIso,
		};
	}
}
