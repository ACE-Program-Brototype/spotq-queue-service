export const ROUTES = {
	ROOT: '/',
	HEALTH: '/health',
	METRICS: '/metrics',
	STAFF_BASE: '/staff',
	REGISTER_WALK_IN: '/restaurants/:restaurantId/queue/walk-in',
	CUSTOMER_BASE: '/customer',
	GET_ETA: '/:restaurantId/eta',
} as const;

export const RESTAURANT_SERVICE_ROUTES = {
	VALIDATION: (restaurantId: string) =>
		`/api/internal/v1/restaurants/${encodeURIComponent(restaurantId)}/validation`,
	TABLE_AVAILABILITY: (restaurantId: string) =>
		`/api/internal/v1/restaurants/${encodeURIComponent(restaurantId)}/tables/availability`,
} as const;

export const ML_ETA_SERVICE_ROUTES = {
	PREDICT: (queryString?: string | URLSearchParams) =>
		queryString ? `/eta/predict?${queryString.toString()}` : '/eta/predict',
} as const;
