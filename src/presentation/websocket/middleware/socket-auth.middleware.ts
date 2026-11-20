import { logger } from '@infrastructure/logger/index.ts';
import { getHeaderValue } from '@presentation/http/middleware/middleware.utils.ts';
import {
	CUSTOMER_ROLE,
	RESTAURANT_OWNER_ROLE,
	STAFF_ROLE,
	WS_ERROR_MESSAGES,
} from '@shared/constants/websocket.constants.ts';
import type { Socket } from 'socket.io';

export interface AuthenticatedSocketUser {
	userId: string;
	role: string;
	restaurantId?: string;
	ticketId?: string;
	email?: string;
}

declare module 'socket.io' {
	interface SocketData {
		user?: AuthenticatedSocketUser;
		[key: string]: unknown;
	}
}

function getParamValue(value: unknown): string | undefined {
	if (typeof value === 'string' && value.trim().length > 0) {
		return value.trim();
	}
	if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim().length > 0) {
		return value[0].trim();
	}
	return undefined;
}

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
	const headers = socket.handshake.headers;
	const query = socket.handshake.query;

	const headerUserId = getHeaderValue(headers['x-user-id']);
	const headerRole = getHeaderValue(headers['x-user-role']);
	const headerRestaurantId = getHeaderValue(headers['x-restaurant-id']);
	const headerTicketId = getHeaderValue(headers['x-ticket-id']);
	const headerEmail = getHeaderValue(headers['x-user-email']);

	if (!headerUserId) {
		logger.warn(
			{ socketId: socket.id, ip: socket.handshake.address },
			'WebSocket connection rejected: Missing authenticated user identity from API Gateway',
		);
		next(new Error(WS_ERROR_MESSAGES.CREDENTIALS_REQUIRED));
		return;
	}

	const role = (headerRole || CUSTOMER_ROLE).toUpperCase();
	const isStaffOrOwner = role === STAFF_ROLE || role === RESTAURANT_OWNER_ROLE;

	const trimmedHeaderTicketId = headerTicketId?.trim();
	const trimmedHeaderRestaurantId = headerRestaurantId?.trim();

	const requestTicketId = trimmedHeaderTicketId || getParamValue(query?.ticketId);
	const effectiveRestaurantId = isStaffOrOwner
		? trimmedHeaderRestaurantId
		: trimmedHeaderRestaurantId || getParamValue(query?.restaurantId);

	const user: AuthenticatedSocketUser = {
		userId: headerUserId,
		role,
		restaurantId: effectiveRestaurantId,
		ticketId: requestTicketId,
		email: headerEmail,
	};

	socket.data.user = user;

	logger.info(
		{
			socketId: socket.id,
			userId: user.userId,
			role: user.role,
			restaurantId: user.restaurantId,
			ticketId: user.ticketId,
		},
		'WebSocket authenticated successfully via API Gateway context headers',
	);

	next();
}
