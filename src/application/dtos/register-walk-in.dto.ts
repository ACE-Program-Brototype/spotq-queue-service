export interface RegisterWalkInInputDTO {
	restaurantId: string;
	staffUserId: string;
	guestName: string;
	guestPhone: string;
	partySize: number;
	specialNotes?: string;
}

export interface RegisterWalkInOutputDTO {
	queueEntryId: string;
	restaurantId: string;
	guestName: string;
	guestPhone: string;
	partySize: number;
	registrationType: 'WALK_IN';
	position: number;
	estimatedWaitMinutes: number;
	status: string;
	joinedAt: string;
}
