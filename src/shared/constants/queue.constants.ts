/**
 * Constants governing queue limits and validation constraints.
 */
export const QUEUE_LIMITS = {
	PARTY_SIZE: {
		MIN: 1,
		MAX: 20,
	},
	GUEST_NAME: {
		MAX: 100,
	},
	SPECIAL_NOTES: {
		MAX: 500,
	},
} as const;

export const PARTY_SIZE_LIMITS = QUEUE_LIMITS.PARTY_SIZE;
