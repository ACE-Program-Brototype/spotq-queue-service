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

export interface AssignTableItem {
	tableId: string;
	count: number;
}

/**
 * Service port interface for communicating with spotq-restaurant-service.
 */
export interface IRestaurantServiceClient {
	checkAvailability(restaurantId: string, partySize: number): Promise<TableAvailabilityResult>;
	getRestaurantStatus(restaurantId: string): Promise<RestaurantStatusResult>;
	assignTables(restaurantId: string, tables: AssignTableItem[]): Promise<void>;
}
