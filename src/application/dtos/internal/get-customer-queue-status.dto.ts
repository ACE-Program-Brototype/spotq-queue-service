export interface GetCustomerQueueStatusInputDTO {
	userId: string;
}

export interface GetCustomerQueueStatusOutputDTO {
	restaurantId: string;
	queueEntryId: string;
}
