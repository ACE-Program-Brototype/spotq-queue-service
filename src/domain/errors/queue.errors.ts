import { AUTH_MESSAGES, messages, QUEUE_MESSAGES } from '@shared/constants/message.constants.ts';
import { SUBSCRIPTION_PLAN_CODES } from '@shared/constants/subscription.constants.ts';
import { DomainError } from './domain.error.ts';

export class TableAvailableError extends DomainError {
	constructor(availableCount = 1, details?: unknown) {
		super(QUEUE_MESSAGES.TABLES_AVAILABLE, 'TABLES_AVAILABLE', {
			availableCount,
			...((details as object) || {}),
		});
	}
}

export class RestaurantNotAcceptingQueueError extends DomainError {
	constructor(message: string = QUEUE_MESSAGES.RESTAURANT_NOT_ACCEPTING) {
		super(message, 'RESTAURANT_NOT_ACCEPTING_QUEUE');
	}
}

export class ActiveQueueEntryExistsError extends DomainError {
	constructor(phone: string) {
		super(`${QUEUE_MESSAGES.ACTIVE_ENTRY_EXISTS} (Phone: ${phone})`, 'ACTIVE_QUEUE_ENTRY_EXISTS');
	}
}

export class ActiveUserQueueEntryExistsError extends DomainError {
	constructor() {
		super(QUEUE_MESSAGES.ACTIVE_USER_ENTRY_EXISTS, 'ACTIVE_QUEUE_ENTRY_EXISTS');
	}
}

export class QueueEntryNotFoundError extends DomainError {
	constructor(id: string) {
		super(QUEUE_MESSAGES.ENTRY_NOT_FOUND, 'QUEUE_ENTRY_NOT_FOUND', { queueEntryId: id });
	}
}

export class UnauthorizedStaffAccessError extends DomainError {
	constructor(message: string = AUTH_MESSAGES.UNAUTHORIZED_RESTAURANT_ACCESS) {
		super(message, 'FORBIDDEN');
	}
}

export class InvalidPartySizeError extends DomainError {
	constructor(message: string = QUEUE_MESSAGES.INVALID_PARTY_SIZE) {
		super(message, 'INVALID_PARTY_SIZE');
	}
}

export class RestaurantBlockedError extends DomainError {
	constructor(restaurantId: string, reason?: string | null) {
		super(
			`${QUEUE_MESSAGES.RESTAURANT_BLOCKED}${reason ? ` Reason: ${reason}` : ''}`,
			'RESTAURANT_BLOCKED',
			{ restaurantId, reason },
		);
	}
}

export class QueueProSubscriptionRequiredError extends DomainError {
	constructor(restaurantId: string, currentPlan?: string | null) {
		super(
			`${QUEUE_MESSAGES.SUBSCRIPTION_REQUIRED} (Current plan: ${currentPlan ?? 'NONE'})`,
			'SUBSCRIPTION_REQUIRED',
			{ restaurantId, currentPlan, requiredPlan: SUBSCRIPTION_PLAN_CODES.QUEUE_PRO },
		);
	}
}

export class RestaurantNotFoundError extends DomainError {
	constructor(restaurantId: string) {
		super(QUEUE_MESSAGES.RESTAURANT_NOT_FOUND, 'RESTAURANT_NOT_FOUND', { restaurantId });
	}
}

export class UpstreamServiceUnavailableError extends DomainError {
	constructor(message: string = QUEUE_MESSAGES.UPSTREAM_SERVICE_UNAVAILABLE, details?: unknown) {
		super(message, 'UPSTREAM_SERVICE_UNAVAILABLE', details);
	}
}

export class QueueEntryNotWaitingError extends DomainError {
	constructor(queueEntryId: string, currentStatus: string) {
		super(QUEUE_MESSAGES.QUEUE_ENTRY_NOT_WAITING, 'QUEUE_ENTRY_NOT_WAITING', {
			queueEntryId,
			currentStatus,
		});
	}
}

export class InsufficientTableCapacityError extends DomainError {
	constructor(partySize: number, totalCapacity: number) {
		super(
			`${QUEUE_MESSAGES.INSUFFICIENT_TABLE_CAPACITY} (Required: ${partySize}, Assigned: ${totalCapacity})`,
			'INSUFFICIENT_TABLE_CAPACITY',
			{ partySize, totalCapacity },
		);
	}
}

export class CannotRingWalkInCustomerError extends DomainError {
	constructor(queueEntryId: string) {
		super(QUEUE_MESSAGES.CANNOT_RING_WALK_IN_CUSTOMER, 'CANNOT_RING_WALK_IN_CUSTOMER', {
			queueEntryId,
		});
	}
}

export class UnauthorizedError extends DomainError {
	constructor(message: string = messages.GATEWAY_UNAUTHORIZED) {
		super(message, 'UNAUTHORIZED');
	}
}

export class ForbiddenTicketAccessError extends DomainError {
	constructor(message: string = 'You are not authorized to access this queue ticket') {
		super(message, 'FORBIDDEN');
	}
}

export class WalkInTicketNotAccessibleError extends DomainError {
	constructor(queueEntryId?: string) {
		super(QUEUE_MESSAGES.WALK_IN_NOT_ACCESSIBLE, 'WALK_IN_TICKET_NOT_ACCESSIBLE', {
			queueEntryId,
		});
	}
}
