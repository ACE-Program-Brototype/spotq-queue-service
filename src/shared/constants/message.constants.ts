/**
 * General application and lifecycle messages.
 */
export const MESSAGES = {
	NOT_FOUND: 'Not Found',
	INTERNAL_SERVER_ERROR: 'Internal Server Error',
	UNEXPECTED_ERROR: 'An unexpected error occurred',
	UNHANDLED_ERROR: 'Unhandled error occurred',
	INCOMING_REQUEST: 'Incoming request',
	REQUEST_COMPLETED: 'Request completed',
	REDIS_CONNECTING: 'Connecting to Redis...',
	REDIS_CONNECTED: 'Redis connected',
	REDIS_READY: 'Redis ready to accept commands',
	REDIS_RECONNECTING: 'Redis reconnecting...',
	REDIS_RECONNECT_FAILED: 'Redis reconnect failed',
	REDIS_ERROR: 'Redis error occurred',
	REDIS_DISCONNECTING: 'Disconnecting Redis client...',
	REDIS_DISCONNECTED: 'Redis disconnected',
	DATABASE_DISCONNECTING: 'Disconnecting database client...',
	DATABASE_DISCONNECTED: 'Database client disconnected',
	SHUTDOWN_SIGINT: 'Received SIGINT. Gracefully shutting down...',
	SHUTDOWN_SIGTERM: 'Received SIGTERM. Gracefully shutting down...',
	SHUTDOWN_IN_PROGRESS: 'Received shutdown signal but shutdown is already in progress...',
	SHUTDOWN_TIMEOUT: 'Graceful shutdown timed out. Forcing exit.',
	SHUTDOWN_COMPLETED: 'Clean graceful shutdown completed.',
	SHUTDOWN_ERROR: 'Error during graceful shutdown',
	HTTP_SERVER_CLOSED: 'HTTP server closed successfully',
	SERVER_BOOTSTRAP_FAILED: 'Failed to bootstrap server',
} as const;

/**
 * Domain-specific queue messages for walk-in and online queue operations.
 */
export const QUEUE_MESSAGES = {
	WALK_IN_REGISTER_SUCCESS: 'Walk-in guest registered to queue successfully',
	ETA_RETRIEVED_SUCCESS: 'Estimated wait time retrieved successfully',
	TABLES_AVAILABLE:
		'Tables are currently available. Seat the guest directly without joining the queue.',
	RESTAURANT_NOT_ACCEPTING: 'Restaurant is currently closed or not accepting queue registrations.',
	ACTIVE_ENTRY_EXISTS:
		'A guest with this phone number is already waiting in this restaurant queue.',
	ENTRY_NOT_FOUND: 'Queue entry was not found.',
	INVALID_PARTY_SIZE: 'Party size must be an integer between 1 and 20.',
	VALIDATION_FAILED: 'Validation failed',
	INVALID_PARAMETERS: 'Invalid request parameters',
	RESTAURANT_BLOCKED:
		'Restaurant is currently blocked by administration. Queue operations are disabled.',
	SUBSCRIPTION_REQUIRED:
		'Restaurant requires an active QUEUE_PRO subscription to access queue services.',
	RESTAURANT_NOT_FOUND: 'Restaurant was not found.',
} as const;

/**
 * Staff and role-based access control authentication messages.
 */
export const AUTH_MESSAGES = {
	CREDENTIALS_REQUIRED: 'Authentication required: Missing staff identity credentials',
	FORBIDDEN_STAFF_ONLY: 'Forbidden: Only authorized STAFF or ADMIN can manage the restaurant queue',
	UNAUTHORIZED_RESTAURANT_ACCESS:
		'Staff member does not have permission to manage this restaurant queue',
} as const;

/**
 * Unified messages dictionary matching spotq ecosystem conventions.
 */
export const messages = {
	SUCCESS: 'Success',
	GATEWAY_UNAUTHORIZED: 'Unauthorized request from gateway',
	STAFF_FORBIDDEN: 'Forbidden: Staff access required',
	FORBIDDEN: 'Forbidden request',
	RESTAURANT_ACCESS_FORBIDDEN: 'Forbidden: You do not have access to this restaurant',
	UNAUTHORIZED: 'Unauthorized access',
	...MESSAGES,
	...QUEUE_MESSAGES,
	...AUTH_MESSAGES,
} as const;

export type Message = (typeof MESSAGES)[keyof typeof MESSAGES];
