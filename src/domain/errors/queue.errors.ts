import { AUTH_MESSAGES, QUEUE_MESSAGES } from '@shared/constants/message.constants.ts';
import { SUBSCRIPTION_PLAN } from '@shared/constants/subscription.constants.ts';
import { DomainError } from './domain.error.ts';

/**
 * Thrown when a table is currently free and available for immediate seating,
 * preventing unnecessary queue creation.
 */
export class TableAvailableError extends DomainError {
	constructor(availableCount = 1, details?: unknown) {
		super(QUEUE_MESSAGES.TABLES_AVAILABLE, 'TABLES_AVAILABLE', {
			availableCount,
			...((details as object) || {}),
		});
	}
}

/**
 * Thrown when the restaurant is closed or does not currently accept queue joins.
 */
export class RestaurantNotAcceptingQueueError extends DomainError {
	constructor(message: string = QUEUE_MESSAGES.RESTAURANT_NOT_ACCEPTING) {
		super(message, 'RESTAURANT_NOT_ACCEPTING_QUEUE');
	}
}

/**
 * Thrown when a party with the specified phone number is already active in the queue.
 */
export class ActiveQueueEntryExistsError extends DomainError {
	constructor(phone: string) {
		super(`${QUEUE_MESSAGES.ACTIVE_ENTRY_EXISTS} (Phone: ${phone})`, 'ACTIVE_QUEUE_ENTRY_EXISTS');
	}
}

/**
 * Thrown when a requested queue ticket or entry does not exist.
 */
export class QueueEntryNotFoundError extends DomainError {
	constructor(id: string) {
		super(`${QUEUE_MESSAGES.ENTRY_NOT_FOUND} (ID: ${id})`, 'QUEUE_ENTRY_NOT_FOUND');
	}
}

/**
 * Thrown when a staff member attempts to manage a restaurant queue they are not authorized for.
 */
export class UnauthorizedStaffAccessError extends DomainError {
	constructor(message: string = AUTH_MESSAGES.UNAUTHORIZED_RESTAURANT_ACCESS) {
		super(message, 'FORBIDDEN');
	}
}

/**
 * Thrown when the party size violates minimum or maximum supported limits.
 */
export class InvalidPartySizeError extends DomainError {
	constructor(message: string = QUEUE_MESSAGES.INVALID_PARTY_SIZE) {
		super(message, 'INVALID_PARTY_SIZE');
	}
}

/**
 * Thrown when the restaurant is suspended or blocked by platform administrators.
 */
export class RestaurantBlockedError extends DomainError {
	constructor(restaurantId: string, reason?: string | null) {
		super(
			`${QUEUE_MESSAGES.RESTAURANT_BLOCKED}${reason ? ` Reason: ${reason}` : ''}`,
			'RESTAURANT_BLOCKED',
			{ restaurantId, reason },
		);
	}
}

/**
 * Thrown when a restaurant lacks the required active QUEUE_PRO subscription.
 */
export class SubscriptionRequiredError extends DomainError {
	constructor(restaurantId: string, currentPlan?: string | null) {
		super(
			`${QUEUE_MESSAGES.SUBSCRIPTION_REQUIRED} (Current plan: ${currentPlan ?? 'NONE'})`,
			'SUBSCRIPTION_REQUIRED',
			{ restaurantId, currentPlan, requiredPlan: SUBSCRIPTION_PLAN.QUEUE_PRO },
		);
	}
}

/**
 * Thrown when the target restaurant is not found.
 */
export class RestaurantNotFoundError extends DomainError {
	constructor(restaurantId: string) {
		super(
			`${QUEUE_MESSAGES.RESTAURANT_NOT_FOUND} (Restaurant ID: ${restaurantId})`,
			'RESTAURANT_NOT_FOUND',
			{ restaurantId },
		);
	}
}

/**
 * Thrown when an external upstream dependency (e.g., restaurant service) is unreachable or fails.
 */
export class UpstreamServiceUnavailableError extends DomainError {
	constructor(
		message: string = 'Upstream service is currently unavailable. Please try again later.',
		details?: unknown,
	) {
		super(message, 'UPSTREAM_SERVICE_UNAVAILABLE', details);
	}
}

export class QueueEntryNotWaitingError extends DomainError {
	constructor(queueEntryId: string, currentStatus: string) {
		super(
			`Queue entry ${queueEntryId} is not in waiting state (current status: ${currentStatus})`,
			'QUEUE_ENTRY_NOT_WAITING',
			{ queueEntryId, currentStatus },
		);
	}
}

export class InsufficientTableCapacityError extends DomainError {
	constructor(partySize: number, totalCapacity: number) {
		super(
			`Total assigned table capacity (${totalCapacity}) is insufficient for party size (${partySize})`,
			'INSUFFICIENT_TABLE_CAPACITY',
			{ partySize, totalCapacity },
		);
	}
}
