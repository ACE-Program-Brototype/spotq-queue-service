import type {
	AssignTablesInputDTO,
	AssignTablesOutputDTO,
} from '@application/dtos/assign-table.dto.ts';
import { AssignTableMapper } from '@application/mappers/assign-table.mapper.ts';
import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { ILogger } from '@application/ports/services/logger-service.port.ts';
import type { IQueuePositionRecalculator } from '@application/ports/services/queue-position-recalculator.port.ts';
import type { IRabbitMQService } from '@application/ports/services/rabbitmq-service.port.ts';
import type { IRestaurantServiceClient } from '@application/ports/services/restaurant-service.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import type { IAssignTableUseCase } from '@application/ports/use-cases/assign-table.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import {
	InsufficientTableCapacityError,
	type IQueueRepository,
	QueueEntryNotFoundError,
} from '@domain/index.ts';
import { WS_SERVER_EVENTS } from '@shared/index.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class AssignTableUseCase implements IAssignTableUseCase {
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
		@inject(TYPES.Services.RabbitMQService)
		private readonly rabbitmqService: IRabbitMQService,
		@inject(TYPES.Logger.PinoClient)
		private readonly logger: ILogger,
	) {}

	async execute(input: AssignTablesInputDTO): Promise<AssignTablesOutputDTO> {
		const { restaurantId, queueEntryId, staffUserId, tables } = input;

		const queueEntry = await this.queueRepository.findById(queueEntryId);
		if (!queueEntry || queueEntry.restaurantId !== restaurantId) {
			throw new QueueEntryNotFoundError(queueEntryId);
		}

		const totalAssignedSeats = tables.reduce((acc, t) => acc + t.count, 0);
		if (totalAssignedSeats < queueEntry.partySize) {
			throw new InsufficientTableCapacityError(queueEntry.partySize, totalAssignedSeats);
		}

		let totalPeopleAheadAtJoin: number | null = null;
		try {
			totalPeopleAheadAtJoin = await this.queueRepository.countPeopleAheadAtJoin(
				restaurantId,
				queueEntry.joinedAt,
			);
		} catch (error) {
			this.logger.warn(
				{ err: error, queueEntryId },
				'Non-blocking: Failed to query total people ahead at join; skipping ML ETA training event',
			);
		}

		const previousStatus = queueEntry.status;
		queueEntry.seat();

		await this.restaurantServiceClient.assignTables(restaurantId, tables);

		const tableIds = tables.map((t) => t.tableId);
		const persistedEntry = await this.queueRepository.assignTablesWithHistory(
			queueEntry,
			tableIds,
			staffUserId,
			previousStatus,
		);

		try {
			await this.queueCacheService.removeLiveEntry(queueEntryId);
		} catch (error) {
			this.logger.error(
				{ err: error, queueEntryId },
				'Non-blocking: Failed to remove seated entry from live Redis cache',
			);
		}

		try {
			await this.queuePositionRecalculator.recalculate(restaurantId);
		} catch (error) {
			this.logger.error(
				{ err: error, restaurantId, queueEntryId },
				'Non-blocking: Failed to recalculate queue positions after table assignment',
			);
		}

		try {
			this.socketBroadcaster.broadcastToRestaurant(restaurantId, WS_SERVER_EVENTS.TICKET_SEATED, {
				event: WS_SERVER_EVENTS.TICKET_SEATED,
				restaurantId,
				queueEntryId,
				tableIds,
				status: persistedEntry.status,
				seatedAt: persistedEntry.seatedAt?.toISOString(),
			});

			this.socketBroadcaster.sendToTicket(queueEntryId, WS_SERVER_EVENTS.TICKET_SEATED, {
				event: WS_SERVER_EVENTS.TICKET_SEATED,
				queueEntryId,
				tableIds,
				status: persistedEntry.status,
				seatedAt: persistedEntry.seatedAt?.toISOString(),
			});
		} catch (error) {
			this.logger.error(
				{ err: error, queueEntryId },
				`Non-blocking: Failed to broadcast ${WS_SERVER_EVENTS.TICKET_SEATED} WebSocket event`,
			);
		}

		if (totalPeopleAheadAtJoin !== null) {
			const trainingEvent = AssignTableMapper.toMlEtaTrainingEvent(
				persistedEntry,
				totalPeopleAheadAtJoin,
			);
			this.rabbitmqService.publishToMlEta(trainingEvent).catch((error) => {
				this.logger.error(
					{ err: error, queueEntryId },
					'Non-blocking: Failed to publish ML ETA training event to RabbitMQ',
				);
			});
		}

		return AssignTableMapper.toOutputDTO(persistedEntry, tableIds);
	}
}
