import type {
	RegisterQueueInputDTO,
	RegisterQueueOutputDTO,
} from '@application/dtos/register-queue.dto.ts';
import { validateRestaurantActiveSubscription } from '@application/helpers/index.ts';
import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { IEtaService } from '@application/ports/services/eta-service.port.ts';
import type { IRestaurantServiceClient } from '@application/ports/services/restaurant-service.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import type { IRegisterQueueUseCase } from '@application/ports/use-cases/register-queue.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import {
	ActiveQueueEntryExistsError,
	type IQueueRepository,
	QueueEntry,
	RegistrationType,
	RestaurantNotAcceptingQueueError,
	TableAvailableError,
} from '@domain/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { WS_SERVER_EVENTS } from '@shared/index.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class RegisterQueueUseCase implements IRegisterQueueUseCase {
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
	 * Executes the unified queue registration pipeline.
	 *
	 * @param input - Registration payload including restaurant, guest, and party details
	 * @returns Queue entry confirmation details
	 * @throws RestaurantBlockedError - When restaurant is blocked by platform administration
	 * @throws SubscriptionRequiredError - When restaurant lacks active QUEUE_PRO subscription
	 * @throws RestaurantNotAcceptingQueueError - When restaurant is closed or queues are disabled
	 * @throws TableAvailableError - When open table exists for immediate seating
	 * @throws ActiveQueueEntryExistsError - When phone number is already actively queued
	 */
	async execute(input: RegisterQueueInputDTO): Promise<RegisterQueueOutputDTO> {
		const {
			restaurantId,
			userId,
			staffUserId,
			guestName,
			guestPhone,
			partySize,
			specialNotes,
			registrationType,
		} = input;

		const restaurantStatus = await this.restaurantServiceClient.getRestaurantStatus(restaurantId);

		validateRestaurantActiveSubscription(restaurantStatus);

		const tableCheck = await this.restaurantServiceClient.checkAvailability(
			restaurantId,
			partySize,
		);

		if (!tableCheck.isOpen || !tableCheck.acceptsQueue) {
			throw new RestaurantNotAcceptingQueueError();
		}

		/*
		 * If a table is already available, the guest must be seated
		 * directly instead of adding them to the waiting queue.
		 */
		if (tableCheck.isTableAvailable) {
			throw new TableAvailableError(tableCheck.availableCount);
		}

		const existingActive = await this.queueRepository.findActiveByPhone(restaurantId, guestPhone);
		if (existingActive) {
			throw new ActiveQueueEntryExistsError(guestPhone);
		}

		if (userId) {
			const existingActiveUser = await this.queueRepository.findActiveByUser(restaurantId, userId);
			if (existingActiveUser) {
				throw new ActiveQueueEntryExistsError(`User: ${userId}`);
			}
		}

		const [activeAheadCount, totalPeopleAhead, countToday] = await Promise.all([
			this.queueRepository.countActiveAhead(restaurantId),
			this.queueRepository.sumPartySizeActiveAhead(restaurantId),
			this.queueRepository.countToday(restaurantId),
		]);

		const position = activeAheadCount + 1;

		const resolvedType =
			(registrationType as RegistrationType) ??
			(userId && !staffUserId ? RegistrationType.ONLINE : RegistrationType.WALK_IN);

		const prefix = resolvedType === RegistrationType.ONLINE ? 'Q-' : 'W-';
		const queueNumber = `${prefix}${String(countToday + 1).padStart(3, '0')}`;

		const estimatedWaitMinutes = await this.etaService.predictEta(
			restaurantId,
			totalPeopleAhead,
			partySize,
		);

		const queueEntry = QueueEntry.create({
			restaurantId,
			userId: userId ?? null,
			guestName,
			phone: guestPhone,
			queueNumber,
			partySize,
			specialNotes,
			fid: input.fcmDeviceToken ?? null,
			registrationType: resolvedType,
			position,
			estimatedWaitMinutes,
		});

		const changedBy = staffUserId || userId || 'system';
		const persisted = await this.queueRepository.createWithHistory(queueEntry, changedBy);

		await this.queueCacheService.saveLiveEntry(
			persisted.id,
			restaurantId,
			position,
			estimatedWaitMinutes,
		);

		try {
			this.socketBroadcaster.broadcastToRestaurant(
				restaurantId,
				WS_SERVER_EVENTS.QUEUE_ENTRY_CREATED,
				{
					event: WS_SERVER_EVENTS.QUEUE_ENTRY_CREATED,
					restaurantId,
					queueEntry: {
						id: persisted.id,
						guestName: persisted.guestName,
						guestPhone: persisted.phone,
						partySize: persisted.partySize,
						specialNotes: persisted.specialNotes,
						registrationType: persisted.registrationType,
						position: persisted.position,
						estimatedWaitMinutes: persisted.estimatedWaitMinutes,
						status: persisted.status,
						joinedAt: persisted.joinedAt.toISOString(),
					},
				},
			);
		} catch (error) {
			logger.error(
				{ err: error, queueEntryId: persisted.id },
				`Non-blocking: Failed to broadcast ${WS_SERVER_EVENTS.QUEUE_ENTRY_CREATED} event via WebSocket`,
			);
		}

		return {
			queueEntryId: persisted.id,
			restaurantId: persisted.restaurantId,
			userId: persisted.userId ?? null,
			guestName: persisted.guestName,
			guestPhone: persisted.phone,
			partySize: persisted.partySize,
			specialNotes: persisted.specialNotes ?? null,
			registrationType: persisted.registrationType,
			position: persisted.position ?? position,
			estimatedWaitMinutes: persisted.estimatedWaitMinutes ?? estimatedWaitMinutes,
			status: persisted.status,
			joinedAt: persisted.joinedAt.toISOString(),
		};
	}
}
