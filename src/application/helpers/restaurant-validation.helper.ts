import type { RestaurantStatusResult } from '@application/ports/services/restaurant-service.port.ts';
import { QueueProSubscriptionRequiredError, RestaurantBlockedError } from '@domain/index.ts';
import { SUBSCRIPTION_PLAN_CODES } from '@shared/index.ts';

export function validateRestaurantActiveSubscription(status: RestaurantStatusResult): void {
	if (status.isBlocked) {
		throw new RestaurantBlockedError(status.restaurantId, status.blockReason);
	}

	if (
		!status.isSubscriptionActive ||
		status.subscriptionPlanCode !== SUBSCRIPTION_PLAN_CODES.QUEUE_PRO
	) {
		throw new QueueProSubscriptionRequiredError(status.restaurantId, status.subscriptionPlanCode);
	}
}
