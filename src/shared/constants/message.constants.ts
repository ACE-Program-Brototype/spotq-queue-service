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
	JOIN_QUEUE_SUCCESS: 'Joined restaurant queue successfully',
	ETA_RETRIEVED_SUCCESS: 'Estimated wait time retrieved successfully',
	TABLES_AVAILABLE:
		'Tables are currently available. Seat the guest directly without joining the queue.',
	RESTAURANT_NOT_ACCEPTING: 'Restaurant is currently closed or not accepting queue registrations.',
	ACTIVE_ENTRY_EXISTS:
		'A guest with this phone number is already waiting in this restaurant queue.',
	ACTIVE_USER_ENTRY_EXISTS: 'You already have an active queue ticket in this restaurant.',
	ENTRY_NOT_FOUND: 'Queue entry was not found.',
	INVALID_PARTY_SIZE: 'Party size must be an integer between 1 and 20.',
	VALIDATION_FAILED: 'Validation failed',
	INVALID_PARAMETERS: 'Invalid request parameters',
	RESTAURANT_BLOCKED:
		'Restaurant is currently blocked by administration. Queue operations are disabled.',
	SUBSCRIPTION_REQUIRED:
		'Restaurant requires an active QUEUE_PRO subscription to access queue services.',
	RESTAURANT_NOT_FOUND: 'Restaurant was not found.',
	TABLE_ASSIGN_SUCCESS: 'Table assigned successfully',
	TABLE_ASSIGN_FAILED: 'Failed to assign table',
	CUSTOMER_RING_SUCCESS: 'Customer notified and rung successfully',
	INVALID_TABLES: 'At least one table must be selected',
	DUPLICATE_TABLE_ID: 'Duplicate table ID detected in assignment list',
	QUEUE_ENTRY_NOT_FOUND: 'Queue entry was not found',
	QUEUE_ENTRY_NOT_WAITING: 'Queue entry is not currently waiting',
	INSUFFICIENT_TABLE_CAPACITY: 'Assigned table capacity is less than party size',
	CANNOT_RING_WALK_IN_CUSTOMER:
		'Walk-in customer cannot be rung as they do not have a registered device',
	UPSTREAM_SERVICE_UNAVAILABLE:
		'Upstream service is currently unavailable. Please try again later.',
	TABLE_ASSIGNMENT_ERROR_PREFIX: 'Restaurant table assignment failed',
	TABLE_ASSIGNMENT_FAILED_UPSTREAM: 'Failed to assign tables upstream',
	ACTIVE_QUEUE_CHECK_SUCCESS: 'Active queue check completed successfully',
} as const;

/**
 * Staff and role-based access control authentication messages.
 */
export const AUTH_MESSAGES = {
	CREDENTIALS_REQUIRED: 'Authentication required: Missing staff identity credentials',
	FORBIDDEN_STAFF_ONLY: 'Forbidden: Only authorized STAFF or ADMIN can manage the restaurant queue',
	UNAUTHORIZED_RESTAURANT_ACCESS:
		'Staff member does not have permission to manage this restaurant queue',
	S2S_ORDER_KEY_MISSING:
		'S2S authentication is misconfigured: public key for order-service is missing',
} as const;

/**
 * Validation error messages.
 */
export const VALIDATION_MESSAGES = {
	INVALID_RESTAURANT_ID_UUID: 'restaurantId must be a valid UUID',
	INVALID_USER_ID_UUID: 'userId must be a valid UUID',
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
	...VALIDATION_MESSAGES,
} as const;

export type Message = (typeof MESSAGES)[keyof typeof MESSAGES];
