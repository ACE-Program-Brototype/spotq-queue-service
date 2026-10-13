import { logger } from '@infrastructure/logger/index.ts';
import {
	isAuthorizedRestaurantMember,
	RESTAURANT_OWNER_ROLE,
	STAFF_ROLES,
	WEBSOCKET_ROOMS,
	WS_CLIENT_EVENTS,
	WS_ERROR_MESSAGES,
	WS_SERVER_EVENTS,
} from '@shared/constants/websocket.constants.ts';
import type { Socket } from 'socket.io';

export interface RoomAckResponse {
	success: boolean;
	room?: string;
	error?: string;
}

export function registerRoomHandlers(socket: Socket): void {
	const user = socket.data.user;

	if (!user) {
		logger.warn(
			{ socketId: socket.id },
			'Attempted to register room handlers without authenticated user',
		);
		return;
	}

	socket.on(
		WS_CLIENT_EVENTS.JOIN_RESTAURANT,
		(data: { restaurantId?: string } | undefined, callback?: (res: RoomAckResponse) => void) => {
			const restaurantId = data?.restaurantId;

			if (!restaurantId || typeof restaurantId !== 'string') {
				const response = { success: false, error: WS_ERROR_MESSAGES.RESTAURANT_ID_REQUIRED };
				socket.emit(WS_SERVER_EVENTS.ERROR, response);
				callback?.(response);
				return;
			}

			const isAuthorized = isAuthorizedRestaurantMember(user, restaurantId);

			if (!isAuthorized) {
				logger.warn(
					{
						userId: user.userId,
						role: user.role,
						userRestaurantId: user.restaurantId,
						targetRestaurantId: restaurantId,
					},
					'Unauthorized attempt to join restaurant room',
				);
				const response = {
					success: false,
					error: WS_ERROR_MESSAGES.UNAUTHORIZED_RESTAURANT,
				};
				socket.emit(WS_SERVER_EVENTS.ERROR, response);
				callback?.(response);
				return;
			}

			const room = WEBSOCKET_ROOMS.restaurant(restaurantId);
			socket.join(room);
			logger.info({ userId: user.userId, room }, 'Socket joined restaurant room');

			const response = { success: true, room };
			socket.emit(WS_SERVER_EVENTS.ROOM_JOINED, response);
			callback?.(response);
		},
	);

	socket.on(
		WS_CLIENT_EVENTS.LEAVE_RESTAURANT,
		(data: { restaurantId?: string } | undefined, callback?: (res: RoomAckResponse) => void) => {
			const restaurantId = data?.restaurantId;
			if (!restaurantId || typeof restaurantId !== 'string') {
				const response = { success: false, error: WS_ERROR_MESSAGES.RESTAURANT_ID_REQUIRED };
				callback?.(response);
				return;
			}

			const room = WEBSOCKET_ROOMS.restaurant(restaurantId);
			socket.leave(room);
			logger.info({ userId: user.userId, room }, 'Socket left restaurant room');

			const response = { success: true, room };
			socket.emit(WS_SERVER_EVENTS.ROOM_LEFT, response);
			callback?.(response);
		},
	);

	socket.on(
		WS_CLIENT_EVENTS.JOIN_TICKET,
		(data: { ticketId?: string } | undefined, callback?: (res: RoomAckResponse) => void) => {
			const ticketId = data?.ticketId;

			if (!ticketId || typeof ticketId !== 'string') {
				const response = { success: false, error: WS_ERROR_MESSAGES.TICKET_ID_REQUIRED };
				socket.emit(WS_SERVER_EVENTS.ERROR, response);
				callback?.(response);
				return;
			}

			const isStaff = STAFF_ROLES.has(user.role);
			const isRestaurantOwner = user.role === RESTAURANT_OWNER_ROLE;
			const isAuthorizedMember = isStaff || isRestaurantOwner;
			const isTicketOwner = user.ticketId === ticketId || user.userId === ticketId;
			const isAuthorized = user.role === 'ADMIN' || isAuthorizedMember || isTicketOwner;

			if (!isAuthorized) {
				logger.warn(
					{
						userId: user.userId,
						userTicketId: user.ticketId,
						targetTicketId: ticketId,
					},
					'Unauthorized attempt to join ticket room',
				);
				const response = {
					success: false,
					error: WS_ERROR_MESSAGES.UNAUTHORIZED_TICKET,
				};
				socket.emit(WS_SERVER_EVENTS.ERROR, response);
				callback?.(response);
				return;
			}

			const room = WEBSOCKET_ROOMS.ticket(ticketId);
			socket.join(room);
			logger.info({ userId: user.userId, room }, 'Socket joined ticket room');

			const response = { success: true, room };
			socket.emit(WS_SERVER_EVENTS.ROOM_JOINED, response);
			callback?.(response);
		},
	);

	socket.on(
		WS_CLIENT_EVENTS.LEAVE_TICKET,
		(data: { ticketId?: string } | undefined, callback?: (res: RoomAckResponse) => void) => {
			const ticketId = data?.ticketId;
			if (!ticketId || typeof ticketId !== 'string') {
				const response = { success: false, error: WS_ERROR_MESSAGES.TICKET_ID_REQUIRED };
				callback?.(response);
				return;
			}

			const room = WEBSOCKET_ROOMS.ticket(ticketId);
			socket.leave(room);
			logger.info({ userId: user.userId, room }, 'Socket left ticket room');

			const response = { success: true, room };
			socket.emit(WS_SERVER_EVENTS.ROOM_LEFT, response);
			callback?.(response);
		},
	);

	socket.on(
		WS_CLIENT_EVENTS.JOIN_QUEUE,
		(data: { queueId?: string } | undefined, callback?: (res: RoomAckResponse) => void) => {
			const queueId = data?.queueId;

			if (!queueId || typeof queueId !== 'string') {
				const response = { success: false, error: WS_ERROR_MESSAGES.QUEUE_ID_REQUIRED };
				socket.emit(WS_SERVER_EVENTS.ERROR, response);
				callback?.(response);
				return;
			}

			const isAdmin = user.role === 'ADMIN';
			const isCustomer = user.role === 'CUSTOMER';
			const isAuthorizedMember = isAuthorizedRestaurantMember(user, queueId);
			const isAuthorized = isAdmin || isCustomer || isAuthorizedMember;

			if (!isAuthorized) {
				logger.warn(
					{
						userId: user.userId,
						userRestaurantId: user.restaurantId,
						targetQueueId: queueId,
					},
					'Unauthorized attempt to join queue room',
				);
				const response = {
					success: false,
					error: WS_ERROR_MESSAGES.UNAUTHORIZED_QUEUE,
				};
				socket.emit(WS_SERVER_EVENTS.ERROR, response);
				callback?.(response);
				return;
			}

			const room = WEBSOCKET_ROOMS.queue(queueId);
			socket.join(room);
			logger.info({ userId: user.userId, room }, 'Socket joined queue room');

			const response = { success: true, room };
			socket.emit(WS_SERVER_EVENTS.ROOM_JOINED, response);
			callback?.(response);
		},
	);

	socket.on(
		WS_CLIENT_EVENTS.LEAVE_QUEUE,
		(data: { queueId?: string } | undefined, callback?: (res: RoomAckResponse) => void) => {
			const queueId = data?.queueId;
			if (!queueId || typeof queueId !== 'string') {
				const response = { success: false, error: WS_ERROR_MESSAGES.QUEUE_ID_REQUIRED };
				callback?.(response);
				return;
			}

			const room = WEBSOCKET_ROOMS.queue(queueId);
			socket.leave(room);
			logger.info({ userId: user.userId, room }, 'Socket left queue room');

			const response = { success: true, room };
			socket.emit(WS_SERVER_EVENTS.ROOM_LEFT, response);
			callback?.(response);
		},
	);
}
