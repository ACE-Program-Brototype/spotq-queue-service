export interface LiveQueueEntryState {
	queueEntryId: string;
	restaurantId: string;
	position: number;
	currentEta: number;
	updatedAt: string;
}

export interface IQueueCacheService {
	saveLiveEntry(
		queueEntryId: string,
		restaurantId: string,
		position: number,
		currentEta: number,
	): Promise<void>;
	getLiveEntry(queueEntryId: string): Promise<LiveQueueEntryState | null>;
	removeLiveEntry(queueEntryId: string): Promise<void>;
	cachePosition?(queueEntryId: string, position: number, ttlSeconds?: number): Promise<void>;
	getCachedPosition?(queueEntryId: string): Promise<number | null>;
	invalidatePosition?(queueEntryId: string): Promise<void>;
}
