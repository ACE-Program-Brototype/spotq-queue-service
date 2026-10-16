export const ROUTES = {
	ROOT: '/',
	HEALTH: '/health',
	METRICS: '/metrics',
	STAFF_BASE: '/staff',
	REGISTER_WALK_IN: '/restaurants/:restaurantId/queue/walk-in',
} as const;

export const RESTAURANT_SERVICE_ROUTES = {
	VALIDATION: (restaurantId: string) =>
		`/api/internal/v1/restaurants/${encodeURIComponent(restaurantId)}/validation`,
	TABLE_AVAILABILITY: (restaurantId: string) =>
		`/api/internal/v1/restaurants/${encodeURIComponent(restaurantId)}/tables/availability`,
} as const;
