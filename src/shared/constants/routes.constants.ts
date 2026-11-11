export const ROUTES = {
	ROOT: '/',
	HEALTH: '/health',
	METRICS: '/metrics',
	STAFF_BASE: '/staff',
	API_V1_STAFF_BASE: '/api/v1/staff',
	REGISTER_WALK_IN: '/restaurants/:restaurantId/queue/walk-in',
	ASSIGN_TABLE: '/queue/:queueEntryId/assign-tables',
	RING_CUSTOMER: '/queue/:queueEntryId/ring',
	STAFF_QUEUE: '/restaurants/:restaurantId',
	SEAT_PARTY: '/restaurants/:restaurantId/queue/:queueEntryId/seat',
	SKIP_PARTY: '/restaurants/:restaurantId/queue/:queueEntryId/skip',
	CANCEL_QUEUE_ENTRY: '/restaurants/:restaurantId/queue/:queueEntryId/cancel',
	CUSTOMER_BASE: '/customer',
	CUSTOMER_ACTIVE_QUEUE: '/active',
	GET_ETA: '/:restaurantId/eta',
	JOIN_QUEUE: '/restaurants/:restaurantId/queue/join',
	CUSTOMER_QUEUE_STATUS: '/restaurants/:restaurantId/queue/status',
	CUSTOMER_LEAVE_QUEUE: '/restaurants/:restaurantId/queue/leave',
} as const;

export const RESTAURANT_SERVICE_ROUTES = {
	VALIDATION: (restaurantId: string) =>
		`/api/internal/v1/restaurants/${encodeURIComponent(restaurantId)}/validation`,
	TABLE_AVAILABILITY: (restaurantId: string) =>
		`/api/internal/v1/restaurants/${encodeURIComponent(restaurantId)}/tables/availability`,
	ASSIGN_TABLE: (restaurantId: string) =>
		`/api/internal/v1/restaurants/${encodeURIComponent(restaurantId)}/tables/assign`,
	RELEASE_TABLE: (restaurantId: string) =>
		`/api/internal/v1/restaurants/${encodeURIComponent(restaurantId)}/tables/release`,
} as const;

export const INTERNAL_ROUTES = {
	BASE: '/api/internal/v1',
	USER_ACTIVE_QUEUE: '/restaurants/:restaurantId/queue/users/:userId/active',
	GET_CUSTOMER_STATUS: '/queue-entries/:userId/status',
} as const;

export const ML_ETA_SERVICE_ROUTES = {
	PREDICT: '/eta/predict',
} as const;
