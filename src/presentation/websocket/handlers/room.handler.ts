import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import type { IQueueRepository } from '@domain/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	ADMIN_ROLE,
	CUSTOMER_ROLE,
	createRoomErrorResponse,
	createRoomSuccessResponse,
	isAuthorizedRestaurantMember,
	RESTAURANT_OWNER_ROLE,
	type RoomAckResponse,
	STAFF_ROLES,
	WEBSOCKET_ROOMS,
	WS_CLIENT_EVENTS,
	WS_ERROR_MESSAGES,
	WS_LOG_MESSAGES,
	WS_SERVER_EVENTS,
} from '@shared/constants/websocket.constants.ts';
import type { Socket } from 'socket.io';

export type { RoomAckResponse };

function emitSuccess(
	socket: Socket,
	event: string,
	room: string,
	callback?: (res: RoomAckResponse) => void,
): void {
	const response = createRoomSuccessResponse(room);
	socket.emit(event, response);
	callback?.(response);
}

function emitError(
	socket: Socket,
	error: string,
	callback?: (res: RoomAckResponse) => void,
	emitToSocket = true,
): void {
	const response = createRoomErrorResponse(error);
	if (emitToSocket) {
		socket.emit(WS_SERVER_EVENTS.ERROR, response);
	}
	callback?.(response);
}

export function registerRoomHandlers(socket: Socket): void {
	const user = socket.data.user;

	if (!user) {
		logger.warn({ socketId: socket.id }, WS_LOG_MESSAGES.UNAUTHENTICATED_HANDLER_REGISTRATION);
		return;
	}

	socket.on(
		WS_CLIENT_EVENTS.JOIN_RESTAURANT,
		(data: { restaurantId?: string } | undefined, callback?: (res: RoomAckResponse) => void) => {
			const restaurantId = data?.restaurantId;

			if (!restaurantId || typeof restaurantId !== 'string') {
				emitError(socket, WS_ERROR_MESSAGES.RESTAURANT_ID_REQUIRED, callback);
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
					WS_LOG_MESSAGES.UNAUTHORIZED_RESTAURANT_JOIN,
				);
				emitError(socket, WS_ERROR_MESSAGES.UNAUTHORIZED_RESTAURANT, callback);
				return;
			}

			const room = WEBSOCKET_ROOMS.restaurant(restaurantId);
			socket.join(room);
			logger.info({ userId: user.userId, room }, WS_LOG_MESSAGES.SOCKET_JOINED_RESTAURANT);

			emitSuccess(socket, WS_SERVER_EVENTS.ROOM_JOINED, room, callback);
		},
	);

	socket.on(
		WS_CLIENT_EVENTS.LEAVE_RESTAURANT,
		(data: { restaurantId?: string } | undefined, callback?: (res: RoomAckResponse) => void) => {
			const restaurantId = data?.restaurantId;
			if (!restaurantId || typeof restaurantId !== 'string') {
				emitError(socket, WS_ERROR_MESSAGES.RESTAURANT_ID_REQUIRED, callback, false);
				return;
			}

			const room = WEBSOCKET_ROOMS.restaurant(restaurantId);
			socket.leave(room);
			logger.info({ userId: user.userId, room }, WS_LOG_MESSAGES.SOCKET_LEFT_RESTAURANT);

			emitSuccess(socket, WS_SERVER_EVENTS.ROOM_LEFT, room, callback);
		},
	);

	socket.on(
		WS_CLIENT_EVENTS.JOIN_TICKET,
		async (data: { ticketId?: string } | undefined, callback?: (res: RoomAckResponse) => void) => {
			const ticketId = data?.ticketId;

			if (!ticketId || typeof ticketId !== 'string') {
				emitError(socket, WS_ERROR_MESSAGES.TICKET_ID_REQUIRED, callback);
				return;
			}

			const isStaff = STAFF_ROLES.has(user.role);
			const isRestaurantOwner = user.role === RESTAURANT_OWNER_ROLE;
			const isAuthorizedMember = isStaff || isRestaurantOwner;
			const isCustomer = user.role === CUSTOMER_ROLE;

			let isAuthorized = user.role === ADMIN_ROLE;

			if (!isAuthorized) {
				if (isCustomer && user.ticketId === ticketId) {
					isAuthorized = true;
				} else if (container.isBound(TYPES.Repositories.QueueRepository)) {
					try {
						const queueRepo = container.get<IQueueRepository>(TYPES.Repositories.QueueRepository);
						const ticket = await queueRepo.findById(ticketId);

						if (ticket) {
							if (
								isAuthorizedMember &&
								user.restaurantId &&
								ticket.restaurantId === user.restaurantId
							) {
								isAuthorized = true;
							} else if (isCustomer && user.userId && ticket.userId === user.userId) {
								isAuthorized = true;
								user.ticketId = ticketId;
							}
						}
					} catch (error) {
						logger.error(
							{ err: error, ticketId, userId: user.userId },
							'Failed to verify ticket authorization for WebSocket room join',
						);
					}
				}
			}

			if (!isAuthorized) {
				logger.warn(
					{
						userId: user.userId,
						userTicketId: user.ticketId,
						targetTicketId: ticketId,
					},
					WS_LOG_MESSAGES.UNAUTHORIZED_TICKET_JOIN,
				);
				emitError(socket, WS_ERROR_MESSAGES.UNAUTHORIZED_TICKET, callback);
				return;
			}

			const room = WEBSOCKET_ROOMS.ticket(ticketId);
			socket.join(room);
			logger.info({ userId: user.userId, room }, WS_LOG_MESSAGES.SOCKET_JOINED_TICKET);

			emitSuccess(socket, WS_SERVER_EVENTS.ROOM_JOINED, room, callback);
		},
	);

	socket.on(
		WS_CLIENT_EVENTS.LEAVE_TICKET,
		(data: { ticketId?: string } | undefined, callback?: (res: RoomAckResponse) => void) => {
			const ticketId = data?.ticketId;
			if (!ticketId || typeof ticketId !== 'string') {
				emitError(socket, WS_ERROR_MESSAGES.TICKET_ID_REQUIRED, callback, false);
				return;
			}

			const room = WEBSOCKET_ROOMS.ticket(ticketId);
			socket.leave(room);
			logger.info({ userId: user.userId, room }, WS_LOG_MESSAGES.SOCKET_LEFT_TICKET);

			emitSuccess(socket, WS_SERVER_EVENTS.ROOM_LEFT, room, callback);
		},
	);

	socket.on(
		WS_CLIENT_EVENTS.JOIN_QUEUE,
		(data: { queueId?: string } | undefined, callback?: (res: RoomAckResponse) => void) => {
			const queueId = data?.queueId;

			if (!queueId || typeof queueId !== 'string') {
				emitError(socket, WS_ERROR_MESSAGES.QUEUE_ID_REQUIRED, callback);
				return;
			}

			const isAdmin = user.role === ADMIN_ROLE;
			const isCustomer = user.role === CUSTOMER_ROLE;
			const isAuthorizedMember = isAuthorizedRestaurantMember(user, queueId);
			const isAuthorized = isAdmin || isCustomer || isAuthorizedMember;

			if (!isAuthorized) {
				logger.warn(
					{
						userId: user.userId,
						userRestaurantId: user.restaurantId,
						targetQueueId: queueId,
					},
					WS_LOG_MESSAGES.UNAUTHORIZED_QUEUE_JOIN,
				);
				emitError(socket, WS_ERROR_MESSAGES.UNAUTHORIZED_QUEUE, callback);
				return;
			}

			const room = WEBSOCKET_ROOMS.queue(queueId);
			socket.join(room);
			logger.info({ userId: user.userId, room }, WS_LOG_MESSAGES.SOCKET_JOINED_QUEUE);

			emitSuccess(socket, WS_SERVER_EVENTS.ROOM_JOINED, room, callback);
		},
	);

	socket.on(
		WS_CLIENT_EVENTS.LEAVE_QUEUE,
		(data: { queueId?: string } | undefined, callback?: (res: RoomAckResponse) => void) => {
			const queueId = data?.queueId;
			if (!queueId || typeof queueId !== 'string') {
				emitError(socket, WS_ERROR_MESSAGES.QUEUE_ID_REQUIRED, callback, false);
				return;
			}

			const room = WEBSOCKET_ROOMS.queue(queueId);
			socket.leave(room);
			logger.info({ userId: user.userId, room }, WS_LOG_MESSAGES.SOCKET_LEFT_QUEUE);

			emitSuccess(socket, WS_SERVER_EVENTS.ROOM_LEFT, room, callback);
		},
	);
}
