import type { QueueStatus, RegistrationType } from '@domain/index.ts';
import type { PartySizeBucket } from '@shared/constants/queue.constants.ts';

export interface GetStaffQueueInputDTO {
	restaurantId: string;
	status?: QueueStatus;
	partySizeBucket?: PartySizeBucket;
}

export interface StaffLiveQueueEntryDTO {
	queueEntryId: string;
	queueNumber: string;
	position: number | null;
	guestName: string;
	guestPhone: string;
	partySize: number;
	specialNotes?: string | null;
	registrationType: RegistrationType;
	status: QueueStatus;
	assignedTableId: string | null;
	joinedAt: string;
	ringCount: number;
	lastRingAt: string | null;
	responseDeadline: string | null;
	waitDurationMinutes: number;
}

export interface GetStaffQueueOutputDTO {
	restaurantId: string;
	totalWaiting: number;
	entries: StaffLiveQueueEntryDTO[];
}
