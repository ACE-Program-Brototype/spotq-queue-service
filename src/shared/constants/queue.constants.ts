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

/**
 * Ordering and limits for queue repository queries.
 */
export const QUEUE_QUERY_CONSTANTS = {
	DEFAULT_STAFF_SNAPSHOT_ORDER_BY: [{ joinedAt: 'asc' as const }, { id: 'asc' as const }],
	LATEST_ACTIVE_TABLE_ASSIGNMENT: {
		ORDER_BY: {
			assignedAt: 'desc' as const,
		},
		TAKE: 1,
	},
} as const;

/**
 * Party size buckets for staff queue filtering.
 */
export const PARTY_SIZE_BUCKET = {
	ALL: 'all',
	SMALL: 'small',
	MEDIUM: 'medium',
	LARGE: 'large',
} as const;

export type PartySizeBucket = (typeof PARTY_SIZE_BUCKET)[keyof typeof PARTY_SIZE_BUCKET];

/**
 * Declarative range bounds mapping for each party size bucket.
 */
export const PARTY_SIZE_RANGE_MAP: Record<
	PartySizeBucket,
	{ minPartySize?: number; maxPartySize?: number }
> = {
	[PARTY_SIZE_BUCKET.ALL]: {},
	[PARTY_SIZE_BUCKET.SMALL]: { minPartySize: 1, maxPartySize: 2 },
	[PARTY_SIZE_BUCKET.MEDIUM]: { minPartySize: 3, maxPartySize: 4 },
	[PARTY_SIZE_BUCKET.LARGE]: { minPartySize: 5 },
} as const;

/**
 * Display number prefixes based on registration channel.
 */
export const QUEUE_PREFIX = {
	ONLINE: 'Q-',
	WALK_IN: 'W-',
} as const;

/**
 * Constants governing queue operations, response timeouts, and party size ranges.
 */
export const QUEUE_CONSTANTS = {
	DEFAULT_RESPONSE_TIMEOUT_MS: 120 * 1000,
	MS_PER_MINUTE: 60 * 1000,
	INITIAL_WAITING_POSITION: 1,
	PARTY_SIZE_BUCKETS: PARTY_SIZE_BUCKET,
	BUCKET_RANGES: PARTY_SIZE_RANGE_MAP,
	QUEUE_PREFIX,
} as const;
