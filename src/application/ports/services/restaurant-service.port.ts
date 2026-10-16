export interface TableAvailabilityResult {
	restaurantId: string;
	isOpen: boolean;
	acceptsQueue: boolean;
	isTableAvailable: boolean;
	availableCount: number;
}

export interface RestaurantStatusResult {
	restaurantId: string;
	restaurantName: string;
	verificationStatus: string;
	isBlocked: boolean;
	blockReason: string | null;
	isSubscriptionActive: boolean;
	subscriptionPlanCode: string | null;
	subscriptionEndsAt: string | null;
	canAccessQueueService?: boolean;
}

/**
 * Service port interface for communicating with spotq-restaurant-service.
 */
export interface IRestaurantServiceClient {
	checkAvailability(restaurantId: string, partySize: number): Promise<TableAvailabilityResult>;
	getRestaurantStatus(restaurantId: string): Promise<RestaurantStatusResult>;
}
