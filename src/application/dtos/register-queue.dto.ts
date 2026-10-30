import type { RegistrationType } from '@domain/enums/queue.enums.ts';

export interface RegisterQueueInputDTO {
	restaurantId: string;
	userId?: string | null;
	staffUserId?: string | null;
	guestName: string;
	guestPhone: string;
	partySize: number;
	specialNotes?: string | null;
	fid?: string | null;
	registrationType?: RegistrationType;
}

export interface RegisterQueueOutputDTO {
	queueEntryId: string;
	restaurantId: string;
	userId?: string | null;
	guestName: string;
	guestPhone: string;
	queueNumber: string;
	partySize: number;
	specialNotes?: string | null;
	registrationType: RegistrationType;
	position: number;
	estimatedWaitMinutes: number;
	status: string;
	joinedAt: string;
}
