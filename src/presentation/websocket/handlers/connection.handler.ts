import { logger } from '@infrastructure/logger/index.ts';
import {
	isAuthorizedRestaurantMember,
	WEBSOCKET_ROOMS,
} from '@shared/constants/websocket.constants.ts';
import type { Server, Socket } from 'socket.io';
import { registerRoomHandlers } from './room.handler.ts';

export function handleSocketConnection(socket: Socket): void {
	const user = socket.data.user;

	if (!user) {
		logger.warn({ socketId: socket.id }, 'Socket connected without authenticated user data');
		socket.disconnect(true);
		return;
	}

	logger.info(
		{
			socketId: socket.id,
			userId: user.userId,
			role: user.role,
			restaurantId: user.restaurantId,
			ticketId: user.ticketId,
		},
		'Client connected to WebSocket server',
	);

	socket.join(WEBSOCKET_ROOMS.user(user.userId));

	if (user.ticketId) {
		socket.join(WEBSOCKET_ROOMS.ticket(user.ticketId));
	}

	if (user.restaurantId && isAuthorizedRestaurantMember(user, user.restaurantId)) {
		socket.join(WEBSOCKET_ROOMS.restaurant(user.restaurantId));
	} else if (user.restaurantId) {
		socket.join(WEBSOCKET_ROOMS.queue(user.restaurantId));
	}

	registerRoomHandlers(socket);

	socket.on('disconnect', (reason: string) => {
		logger.info(
			{
				socketId: socket.id,
				userId: user.userId,
				reason,
			},
			'Client disconnected from WebSocket server',
		);
	});
}

export function registerConnectionHandlers(io: Server): void {
	io.on('connection', (socket: Socket) => {
		handleSocketConnection(socket);
	});
}
