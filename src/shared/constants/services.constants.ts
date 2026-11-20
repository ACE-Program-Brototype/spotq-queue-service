export const SERVICES = {
	QUEUE_SERVICE: 'queue-service',
	ORDER_SERVICE: 'order-service',
	RESTAURANT_SERVICE: 'restaurant-service',
	ML_ETA_SERVICE: 'ml-eta-service',
} as const;

export type ServiceName = (typeof SERVICES)[keyof typeof SERVICES];
