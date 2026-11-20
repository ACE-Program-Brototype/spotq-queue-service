export interface PositionRecalculationResult {
	affectedCount: number;
	updatedEntryIds: string[];
}

export interface IQueuePositionRecalculator {
	recalculate(restaurantId: string): Promise<PositionRecalculationResult>;
}
