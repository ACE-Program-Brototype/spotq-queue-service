export interface GetQueueEtaInputDTO {
	restaurantId: string;
	partySize: number;
}

export interface GetQueueEtaOutputDTO {
	restaurantId: string;
	partySize: number;
	estimatedWaitMinutes: number;
	queueDepth: number;
	calculatedAt: string;
}
