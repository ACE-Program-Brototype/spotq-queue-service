export interface SkipPartyInputDTO {
	restaurantId: string;
	queueEntryId: string;
	staffUserId: string;
	reason: string;
	skipPositions?: number;
}

export interface SkipPartyOutputDTO {
	queueEntryId: string;
	restaurantId: string;
	status: string;
	reason: string;
	position: number | null;
}
