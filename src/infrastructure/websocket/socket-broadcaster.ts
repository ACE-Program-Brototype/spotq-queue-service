import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { WEBSOCKET_ROOMS } from '@shared/constants/websocket.constants.ts';
import { injectable, unmanaged } from 'inversify';
import type { Server } from 'socket.io';
import { getSocketServer } from './socket.server.ts';

/**
 * WebSocket broadcaster implementing IWebSocketBroadcaster.
 *
 * Broadcasts events across scoped Socket.IO rooms:
 * - restaurant:{restaurantId} - Staff dashboard updates
 * - queue:{queueId} - Public queue displays
 * - ticket:{ticketId} - Individual guest ticket updates
 *
 * Can receive a Server instance directly (when initialized with the HTTP server)
 * or lazily obtain the active Server instance when resolved via DI container.
 */
@injectable()
export class SocketBroadcaster implements IWebSocketBroadcaster {
	constructor(@unmanaged() private readonly io?: Server) {}

	private getIo(): Server | null {
		if (this.io) {
			return this.io;
		}
		try {
			return getSocketServer();
		} catch {
			return null;
		}
	}

	/**
	 * Emits a real-time event to all staff in the restaurant room.
	 *
	 * @param restaurantId - Restaurant UUID
	 * @param event - Event name string
	 * @param data - Event payload
	 */
	broadcastToRestaurant<T = unknown>(restaurantId: string, event: string, data: T): void {
		const server = this.getIo();
		if (!server) {
			logger.warn({ restaurantId, event }, 'Socket server not active, skipping broadcast');
			return;
		}
		const room = WEBSOCKET_ROOMS.restaurant(restaurantId);
		logger.debug({ room, event }, 'Broadcasting WebSocket event to restaurant room');
		server.to(room).emit(event, data);
	}

	/**
	 * Emits a real-time event to all subscribers in the queue room.
	 *
	 * @param queueId - Queue UUID
	 * @param event - Event name string
	 * @param data - Event payload
	 */
	broadcastToQueue<T = unknown>(queueId: string, event: string, data: T): void {
		const server = this.getIo();
		if (!server) {
			logger.warn({ queueId, event }, 'Socket server not active, skipping broadcast');
			return;
		}
		const room = WEBSOCKET_ROOMS.queue(queueId);
		logger.debug({ room, event }, 'Broadcasting WebSocket event to queue room');
		server.to(room).emit(event, data);
	}

	/**
	 * Emits a targeted event to an individual guest ticket room.
	 *
	 * @param ticketId - Ticket UUID
	 * @param event - Event name string
	 * @param data - Event payload
	 */
	sendToTicket<T = unknown>(ticketId: string, event: string, data: T): void {
		const server = this.getIo();
		if (!server) {
			logger.warn({ ticketId, event }, 'Socket server not active, skipping broadcast');
			return;
		}
		const room = WEBSOCKET_ROOMS.ticket(ticketId);
		logger.debug({ room, event }, 'Broadcasting WebSocket event to ticket room');
		server.to(room).emit(event, data);
	}
}
