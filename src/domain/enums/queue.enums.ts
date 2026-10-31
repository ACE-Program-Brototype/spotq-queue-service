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

export const REGISTRATION_TYPE = RegistrationType;
export type REGISTRATION_TYPE = RegistrationType;
