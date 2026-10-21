/**
 * Constants governing queue limits and validation constraints.
 */
export const QUEUE_LIMITS = {
	PARTY_SIZE: {
		MIN: 1,
		MAX: 20,
	},
} as const;

export const PARTY_SIZE_LIMITS = QUEUE_LIMITS.PARTY_SIZE;
