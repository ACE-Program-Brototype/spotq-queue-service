import { validateRestaurantActiveSubscription } from '../src/application/helpers/restaurant-validation.helper.ts';
import type { RestaurantStatusResult } from '../src/application/ports/services/restaurant-service.port.ts';
import { QueueProSubscriptionRequiredError, RestaurantBlockedError } from '../src/domain/index.ts';
import { SUBSCRIPTION_PLAN } from '../src/shared/index.ts';

describe('validateRestaurantActiveSubscription', () => {
	const validStatus: RestaurantStatusResult = {
		restaurantId: 'rest-uuid-1',
		restaurantName: 'Test Diner',
		verificationStatus: 'VERIFIED',
		isBlocked: false,
		blockReason: null,
		isSubscriptionActive: true,
		subscriptionPlanCode: SUBSCRIPTION_PLAN.QUEUE_PRO,
		subscriptionEndsAt: '2026-12-31T23:59:59Z',
	};

	it('should pass without error when restaurant is active and has QUEUE_PRO subscription', () => {
		expect(() => validateRestaurantActiveSubscription(validStatus)).not.toThrow();
	});

	it('should throw RestaurantBlockedError when restaurant is blocked', () => {
		const blockedStatus: RestaurantStatusResult = {
			...validStatus,
			isBlocked: true,
			blockReason: 'Payment default',
		};

		expect(() => validateRestaurantActiveSubscription(blockedStatus)).toThrow(
			RestaurantBlockedError,
		);
	});

	it('should throw QueueProSubscriptionRequiredError when subscription is inactive', () => {
		const inactiveSubStatus: RestaurantStatusResult = {
			...validStatus,
			isSubscriptionActive: false,
		};

		expect(() => validateRestaurantActiveSubscription(inactiveSubStatus)).toThrow(
			QueueProSubscriptionRequiredError,
		);
	});

	it('should throw QueueProSubscriptionRequiredError when subscription plan is not QUEUE_PRO', () => {
		const wrongPlanStatus: RestaurantStatusResult = {
			...validStatus,
			subscriptionPlanCode: 'BASIC_PLAN',
		};

		expect(() => validateRestaurantActiveSubscription(wrongPlanStatus)).toThrow(
			QueueProSubscriptionRequiredError,
		);
	});
});
