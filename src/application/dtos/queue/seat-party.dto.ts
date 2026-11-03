export interface SeatPartyInputDTO {
	restaurantId: string;
	queueEntryId: string;
	staffUserId: string;
	tableIds: string[];
}

export interface SeatPartyOutputDTO {
	queueEntryId: string;
	restaurantId: string;
	status: string;
	tableIds: string[];
	seatedAt: string;
}
