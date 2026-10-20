/**
 * Constants governing ETA service communication and heuristic wait time fallbacks.
 */
export const ETA_CONSTANTS = {
	DEFAULT_TIMEOUT_MS: 1000,
	BASE_FALLBACK_MINUTES: 5,
	FALLBACK_MINUTES_PER_PERSON: 2.5,
} as const;

export type EtaConstants = typeof ETA_CONSTANTS;
