import type {
	RegisterWalkInInputDTO,
	RegisterWalkInOutputDTO,
} from '@application/dtos/register-walk-in.dto.ts';
import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { IEtaService } from '@application/ports/services/eta-service.port.ts';
import type { IRestaurantServiceClient } from '@application/ports/services/restaurant-service.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import type { IRegisterWalkInUseCase } from '@application/ports/use-cases/register-walk-in.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import {
	ActiveQueueEntryExistsError,
	type IQueueRepository,
	QueueEntry,
	RestaurantBlockedError,
	RestaurantNotAcceptingQueueError,
	SubscriptionRequiredError,
	TableAvailableError,
} from '@domain/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { inject, injectable } from 'inversify';

/**
 * Use case orchestrating walk-in guest registration into the unified restaurant queue.
 *
 * Workflow:
 * 1. Checks remote table availability via restaurant service:
 *    - Rejects if restaurant is closed or queue joins are disabled.
 *    - Rejects if a matching table is currently available (party should be seated immediately).
 * 2. Checks for existing active queue registrations with the same phone number.
 * 3. Calculates current queue depth and ordinal position.
 * 4. Inquires live wait-time estimate from ML ETA service (with graceful heuristic fallback).
 * 5. Generates human-friendly daily queue ticket number (e.g., 'W-001').
 * 6. Atomically creates QueueEntry and QueueStatusHistory records.
 * 7. Caches live position and estimated wait time in Redis.
 * 8. Dispatches real-time QUEUE_ENTRY_CREATED notification via WebSocket gateway.
 * 9. Returns client-facing walk-in registration details.
 */
@injectable()
export class RegisterWalkInUseCase implements IRegisterWalkInUseCase {
	constructor(
		@inject(TYPES.Repositories.QueueRepository)
		private readonly queueRepository: IQueueRepository,
		@inject(TYPES.Services.RestaurantServiceClient)
		private readonly restaurantServiceClient: IRestaurantServiceClient,
		@inject(TYPES.Services.EtaService)
		private readonly etaService: IEtaService,
		@inject(TYPES.Services.QueueCacheService)
		private readonly queueCacheService: IQueueCacheService,
		@inject(TYPES.Services.WebSocketBroadcaster)
		private readonly socketBroadcaster: IWebSocketBroadcaster,
	) {}

	/**
	 * Executes walk-in registration pipeline.
	 *
	 * @param input - Walk-in registration payload including guest details and party size
	 * @returns Walk-in queue entry confirmation details
	 * @throws RestaurantNotAcceptingQueueError - When restaurant is closed or queues are disabled
	 * @throws TableAvailableError - When open table exists for immediate seating
	 * @throws ActiveQueueEntryExistsError - When phone number is already actively queued
	 */
	async execute(input: RegisterWalkInInputDTO): Promise<RegisterWalkInOutputDTO> {
		const { restaurantId, staffUserId, guestName, guestPhone, partySize } = input;

		// 1. Service-to-service check: Verify restaurant status, block state, and QUEUE_PRO subscription
		const restaurantStatus = await this.restaurantServiceClient.getRestaurantStatus(restaurantId);

		if (restaurantStatus.isBlocked) {
			throw new RestaurantBlockedError(restaurantId, restaurantStatus.blockReason);
		}

		if (
			!restaurantStatus.isSubscriptionActive ||
			restaurantStatus.subscriptionPlanCode !== 'QUEUE_PRO'
		) {
			throw new SubscriptionRequiredError(restaurantId, restaurantStatus.subscriptionPlanCode);
		}

		// 2. Service-to-service check: Verify opening state and table availability
		const tableCheck = await this.restaurantServiceClient.checkAvailability(
			restaurantId,
			partySize,
		);

		if (!tableCheck.isOpen || !tableCheck.acceptsQueue) {
			throw new RestaurantNotAcceptingQueueError();
		}

		// If a table is already available, guest should be seated directly without queueing
		if (tableCheck.isTableAvailable) {
			throw new TableAvailableError(tableCheck.availableCount);
		}

		// 2. Prevent duplicate active registrations with the same phone
		const existingActive = await this.queueRepository.findActiveByPhone(restaurantId, guestPhone);
		if (existingActive) {
			throw new ActiveQueueEntryExistsError(guestPhone);
		}

		// 3. Calculate queue volume and initial queue position
		const [activeAheadCount, totalPeopleAhead, countToday] = await Promise.all([
			this.queueRepository.countActiveAhead(restaurantId),
			this.queueRepository.sumPartySizeActiveAhead(restaurantId),
			this.queueRepository.countToday(restaurantId),
		]);

		const position = activeAheadCount + 1;
		const queueNumber = `W-${String(countToday + 1).padStart(3, '0')}`;

		// 4. Retrieve wait time estimate from ML ETA Service (with automatic fallback)
		const estimatedWaitMinutes = await this.etaService.predictEta(
			restaurantId,
			totalPeopleAhead,
			partySize,
		);

		// 5. Instantiate domain entity
		const queueEntry = QueueEntry.createWalkIn({
			restaurantId,
			guestName,
			phone: guestPhone,
			queueNumber,
			partySize,
			position,
			estimatedWaitMinutes,
		});

		// 6. Persist queue entry and status history atomically
		const persisted = await this.queueRepository.createWithHistory(queueEntry, staffUserId);

		// 7. Store live position and ETA in Redis
		await this.queueCacheService.saveLiveEntry(
			persisted.id,
			restaurantId,
			position,
			estimatedWaitMinutes,
		);

		// 8. Broadcast QUEUE_ENTRY_CREATED to the restaurant staff room
		try {
			this.socketBroadcaster.broadcastToRestaurant(restaurantId, 'QUEUE_ENTRY_CREATED', {
				event: 'QUEUE_ENTRY_CREATED',
				restaurantId,
				queueEntry: {
					id: persisted.id,
					guestName: persisted.guestName,
					guestPhone: persisted.phone,
					partySize: persisted.partySize,
					registrationType: persisted.registrationType,
					position: persisted.position,
					estimatedWaitMinutes: persisted.estimatedWaitMinutes,
					status: persisted.status,
					joinedAt: persisted.joinedAt.toISOString(),
				},
			});
		} catch (error) {
			logger.error(
				{ err: error, queueEntryId: persisted.id },
				'Non-blocking: Failed to broadcast QUEUE_ENTRY_CREATED event via WebSocket',
			);
		}

		// 9. Return standardized output DTO
		return {
			queueEntryId: persisted.id,
			restaurantId: persisted.restaurantId,
			guestName: persisted.guestName,
			guestPhone: persisted.phone,
			partySize: persisted.partySize,
			registrationType: 'WALK_IN',
			position: persisted.position ?? position,
			estimatedWaitMinutes: persisted.estimatedWaitMinutes ?? estimatedWaitMinutes,
			status: persisted.status,
			joinedAt: persisted.joinedAt.toISOString(),
		};
	}
}
