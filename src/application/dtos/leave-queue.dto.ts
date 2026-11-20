import type { QueueStatus } from '@domain/enums/queue.enums.ts';

export interface LeaveQueueInputDTO {
	restaurantId: string;
	queueEntryId: string;
	userId: string;
}

export interface LeaveQueueOutputDTO {
	queueEntryId: string;
	restaurantId: string;
	status: QueueStatus;
	cancelledAt: string;
}
