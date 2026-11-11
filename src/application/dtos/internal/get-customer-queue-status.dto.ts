import type { QueueStatus } from '@domain/index';

export interface GetCustomerQueueStatusInputDTO {
	userId: string;
}

export interface GetCustomerQueueStatusOutputDTO {
	restaurantId: string;
	queueEntryId: string;
	queueNumber: string;
	status: QueueStatus;
}
