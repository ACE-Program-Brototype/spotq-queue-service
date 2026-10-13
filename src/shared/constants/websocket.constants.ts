export const WEBSOCKET_ROOM_PREFIXES = {
	RESTAURANT: 'restaurant:',
	QUEUE: 'queue:',
	TICKET: 'ticket:',
	USER: 'user:',
} as const;

export const WEBSOCKET_ROOMS = {
	restaurant: (restaurantId: string): string => `restaurant:${restaurantId}`,
	queue: (queueId: string): string => `queue:${queueId}`,
	ticket: (ticketId: string): string => `ticket:${ticketId}`,
	user: (userId: string): string => `user:${userId}`,
} as const;

export const WS_CLIENT_EVENTS = {
	JOIN_RESTAURANT: 'join:restaurant',
	LEAVE_RESTAURANT: 'leave:restaurant',
	JOIN_QUEUE: 'join:queue',
	LEAVE_QUEUE: 'leave:queue',
	JOIN_TICKET: 'join:ticket',
	LEAVE_TICKET: 'leave:ticket',
} as const;

export const WS_SERVER_EVENTS = {
	QUEUE_JOINED: 'queue:joined',
	QUEUE_POSITION_UPDATED: 'queue:position-updated',
	QUEUE_UPDATED: 'queue:updated',
	TICKET_CALLED: 'ticket:called',
	TICKET_CANCELLED: 'ticket:cancelled',
	TICKET_SEATED: 'ticket:seated',
	ROOM_JOINED: 'room:joined',
	ROOM_LEFT: 'room:left',
	ERROR: 'error',
} as const;

export const WEBSOCKET_CONFIG = {
	DEFAULT_PATH: '/ws',
	PING_TIMEOUT: 20000,
	PING_INTERVAL: 25000,
} as const;

export const WS_ERROR_MESSAGES = {
	RESTAURANT_ID_REQUIRED: 'restaurantId is required',
	QUEUE_ID_REQUIRED: 'queueId is required',
	TICKET_ID_REQUIRED: 'ticketId is required',
	UNAUTHORIZED_RESTAURANT: 'Unauthorized: Cannot access this restaurant queue',
	UNAUTHORIZED_QUEUE: 'Unauthorized: Cannot access this queue',
	UNAUTHORIZED_TICKET: 'Unauthorized: Cannot access this ticket',
	CREDENTIALS_REQUIRED: 'Authentication failed: Credentials required',
	MALFORMED_TOKEN: 'Authentication failed: Malformed token',
	INVALID_TOKEN_PAYLOAD: 'Authentication failed: Invalid token payload',
	MISSING_IDENTITY: 'Authentication failed: Missing user or ticket identity',
} as const;

export const STAFF_ROLES: ReadonlySet<string> = new Set(['STAFF']);
export const RESTAURANT_OWNER_ROLE = 'RESTAURANT_OWNER';
export const ADMIN_ROLE = 'ADMIN';

export function isAuthorizedRestaurantMember(
	user: { role?: string; restaurantId?: string } | undefined,
	requestedRestaurantId: string,
): boolean {
	if (!user) {
		return false;
	}
	if (user.role === ADMIN_ROLE) {
		return true;
	}
	const isStaff = user.role ? STAFF_ROLES.has(user.role) : false;
	const isRestaurantOwner = user.role === RESTAURANT_OWNER_ROLE;
	return (isStaff || isRestaurantOwner) && user.restaurantId === requestedRestaurantId;
}
