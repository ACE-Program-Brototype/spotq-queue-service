import type { QueueStatus, RegistrationType } from '@domain/index.ts';

export interface GetCustomerQueueStatusSnapshotInputDTO {
	restaurantId: string;
	queueEntryId: string;
}

export interface GetCustomerQueueStatusSnapshotOutputDTO {
	queueEntryId: string;
	restaurantId: string;
	restaurantName: string;
	queueNumber: string;
	guestName: string;
	partySize: number;
	position: number | null;
	totalWaitingParties: number;
	estimatedWaitMinutes: number | null;
	status: QueueStatus;
	registrationType: RegistrationType;
	joinedAt: string;
	updatedAt: string;
	lastRingAt: string | null;
	responseDeadline: string | null;
	assignedTableId: string | null;
}
