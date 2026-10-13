import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';

import { logger } from '@infrastructure/logger/index.ts';
import { WEBSOCKET_ROOMS } from '@shared/constants/websocket.constants.ts';
import type { Server } from 'socket.io';

export class SocketBroadcaster implements IWebSocketBroadcaster {
	constructor(private readonly io: Server) {}

	broadcastToRestaurant<T = unknown>(restaurantId: string, event: string, data: T): void {
		const room = WEBSOCKET_ROOMS.restaurant(restaurantId);
		logger.debug({ room, event }, 'Broadcasting WebSocket event to restaurant room');
		this.io.to(room).emit(event, data);
	}

	broadcastToQueue<T = unknown>(queueId: string, event: string, data: T): void {
		const room = WEBSOCKET_ROOMS.queue(queueId);
		logger.debug({ room, event }, 'Broadcasting WebSocket event to queue room');
		this.io.to(room).emit(event, data);
	}

	sendToTicket<T = unknown>(ticketId: string, event: string, data: T): void {
		const room = WEBSOCKET_ROOMS.ticket(ticketId);
		logger.debug({ room, event }, 'Broadcasting WebSocket event to ticket room');
		this.io.to(room).emit(event, data);
	}
}
