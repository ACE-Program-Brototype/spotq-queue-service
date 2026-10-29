export const ROUTES = {
	ROOT: '/',
	HEALTH: '/health',
	METRICS: '/metrics',
	STAFF_BASE: '/staff',
	REGISTER_WALK_IN: '/restaurants/:restaurantId/queue/walk-in',
	ASSIGN_TABLE: '/queue/:queueEntryId/assign-tables',
	RING_CUSTOMER: '/queue/:queueEntryId/ring',
	STAFF_QUEUE: '/restaurants/:restaurantId',
	CUSTOMER_BASE: '/customer',
	GET_ETA: '/:restaurantId/eta',
} as const;

export const RESTAURANT_SERVICE_ROUTES = {
	VALIDATION: (restaurantId: string) =>
		`/api/internal/v1/restaurants/${encodeURIComponent(restaurantId)}/validation`,
	TABLE_AVAILABILITY: (restaurantId: string) =>
		`/api/internal/v1/restaurants/${encodeURIComponent(restaurantId)}/tables/availability`,
	ASSIGN_TABLE: (restaurantId: string) =>
		`/api/internal/v1/restaurants/${encodeURIComponent(restaurantId)}/tables/assign`,
} as const;

export const INTERNAL_ROUTES = {
	BASE: '/api/internal/v1',
	USER_ACTIVE_QUEUE: '/restaurants/:restaurantId/queue/users/:userId/active',
} as const;

export const ML_ETA_SERVICE_ROUTES = {
	PREDICT: '/eta/predict',
} as const;
