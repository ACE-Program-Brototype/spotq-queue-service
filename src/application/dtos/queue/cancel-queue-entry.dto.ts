export interface CancelQueueEntryInputDTO {
	restaurantId: string;
	queueEntryId: string;
	staffUserId: string;
	reason: string;
	notes?: string;
}

export interface CancelQueueEntryOutputDTO {
	queueEntryId: string;
	restaurantId: string;
	status: string;
	reason: string;
	notes?: string | null;
	cancelledAt: string;
}
