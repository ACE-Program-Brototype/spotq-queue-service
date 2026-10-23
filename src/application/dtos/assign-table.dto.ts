import type { QueueStatus } from '@domain/enums/queue.enums.ts';

export interface AssignTableItemDTO {
	tableId: string;
	count: number;
}

export interface AssignTablesInputDTO {
	restaurantId: string;
	queueEntryId: string;
	staffUserId: string;
	tables: AssignTableItemDTO[];
}

export interface AssignTablesOutputDTO {
	queueEntryId: string;
	restaurantId: string;
	tableIds: string[];
	status: QueueStatus;
	seatedAt: string;
}
