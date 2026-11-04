export enum QueueStatus {
	WAITING = 'WAITING',
	SEATED = 'SEATED',
	SKIPPED = 'SKIPPED',
	CANCELLED = 'CANCELLED',
	NO_SHOW = 'NO_SHOW',
}

export enum RegistrationType {
	ONLINE = 'ONLINE',
	WALK_IN = 'WALK_IN',
}

export enum QueueCancelReason {
	NO_SHOW = 'NO_SHOW',
	GUEST_CANCELLED = 'GUEST_CANCELLED',
	WALK_OUT = 'WALK_OUT',
	OTHER = 'OTHER',
}

export const REGISTRATION_TYPE = RegistrationType;
export type REGISTRATION_TYPE = RegistrationType;
