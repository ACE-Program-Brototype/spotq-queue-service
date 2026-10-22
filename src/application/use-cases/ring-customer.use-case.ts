import type {
	RingCustomerInputDTO,
	RingCustomerOutputDTO,
} from '@application/dtos/ring-customer.dto.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import type { IRingCustomerUseCase } from '@application/ports/use-cases/ring-customer.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import type { IQueueRepository, IQueueService } from '@domain/index.ts';
import { QueueEntryNotFoundError } from '@domain/index.ts';
import { config } from '@infrastructure/config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	JOB_NAMES,
	PUSH_NOTIFICATION_JOB_OPTIONS,
	QUEUE_NAMES,
} from '@infrastructure/queue/index.ts';
import { NOTIFICATION_MESSAGES } from '@shared/constants/notification.constants.ts';
import { WS_SERVER_EVENTS } from '@shared/constants/websocket.constants.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class RingCustomerUseCase implements IRingCustomerUseCase {
	constructor(
		@inject(TYPES.Repositories.QueueRepository)
		private readonly queueRepository: IQueueRepository,
		@inject(TYPES.Services.QueueService)
		private readonly queueService: IQueueService,
		@inject(TYPES.Services.WebSocketBroadcaster)
		private readonly socketBroadcaster: IWebSocketBroadcaster,
	) {}

	async execute(input: RingCustomerInputDTO): Promise<RingCustomerOutputDTO> {
		const { restaurantId, queueEntryId } = input;

		const entry = await this.queueRepository.findById(queueEntryId);
		if (!entry || entry.restaurantId !== restaurantId) {
			throw new QueueEntryNotFoundError(queueEntryId);
		}

		entry.ring();

		await this.queueRepository.save(entry);

		const deepLinkBase = config.notifications.ticketDeepLinkBaseUrl?.replace(/\/$/, '');
		const deepLink = deepLinkBase ? `${deepLinkBase}/${entry.id}` : undefined;

		let notificationDispatched = false;
		if (entry.fid) {
			try {
				await this.queueService.addJob(
					QUEUE_NAMES.PUSH_NOTIFICATIONS,
					JOB_NAMES.SEND_PUSH_NOTIFICATION,
					{
						fid: entry.fid,
						title: NOTIFICATION_MESSAGES.TABLE_READY_TITLE,
						body: NOTIFICATION_MESSAGES.TABLE_READY_BODY(entry.guestName),
						deepLink,
						data: {
							queueEntryId: entry.id,
							restaurantId: entry.restaurantId,
							...(deepLink && { click_action: deepLink, deepLink }),
						},
					},
					PUSH_NOTIFICATION_JOB_OPTIONS,
				);
				notificationDispatched = true;
			} catch (error) {
				logger.error(
					{ err: error, queueEntryId: entry.id },
					'Non-blocking: Failed to enqueue push notification job in BullMQ',
				);
			}
		}

		try {
			this.socketBroadcaster.sendToTicket(entry.id, WS_SERVER_EVENTS.TICKET_CALLED, {
				event: WS_SERVER_EVENTS.TICKET_CALLED,
				queueEntryId: entry.id,
				restaurantId: entry.restaurantId,
				ringCount: entry.ringCount,
				lastRingedAt: entry.lastRingedAt?.toISOString(),
				...(deepLink && { deepLink }),
				message: 'Your table is ready! Please proceed to the host stand.',
			});
		} catch (error) {
			logger.error(
				{ err: error, queueEntryId: entry.id },
				`Non-blocking: Failed to broadcast ${WS_SERVER_EVENTS.TICKET_CALLED} WebSocket event`,
			);
		}

		return {
			queueEntryId: entry.id,
			restaurantId: entry.restaurantId,
			guestName: entry.guestName,
			ringCount: entry.ringCount,
			lastRingedAt: (entry.lastRingedAt ?? new Date()).toISOString(),
			notificationDispatched,
		};
	}
}
