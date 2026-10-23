export interface RingCustomerInputDTO {
	restaurantId: string;
	queueEntryId: string;
	staffUserId: string;
}

export interface RingCustomerOutputDTO {
	queueEntryId: string;
	restaurantId: string;
	guestName: string;
	ringCount: number;
	lastRingedAt: string;
	notificationDispatched: boolean;
}
