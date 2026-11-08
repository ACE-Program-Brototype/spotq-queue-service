export const REDIS_QUEUE_CACHE = {
	KEY_PREFIX: 'queue:live:',
	TTL_SECONDS: 86400,
	POSITION_KEY_PREFIX: 'queue:entry:',
	POSITION_KEY_SUFFIX: ':position',
	POSITION_TTL_SECONDS: 15,
} as const;
