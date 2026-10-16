import type { RegistrationType } from '@domain/enums/queue.enums.ts';

export interface RegisterQueueInputDTO {
	restaurantId: string;
	userId?: string | null;
	staffUserId?: string | null;
	guestName: string;
	guestPhone: string;
	partySize: number;
	specialNotes?: string | null;
	registrationType?: RegistrationType | 'WALK_IN' | 'ONLINE';
}

export interface RegisterQueueOutputDTO {
	queueEntryId: string;
	restaurantId: string;
	userId?: string | null;
	guestName: string;
	guestPhone: string;
	partySize: number;
	specialNotes?: string | null;
	registrationType: RegistrationType | 'WALK_IN' | 'ONLINE';
	position: number;
	estimatedWaitMinutes: number;
	status: string;
	joinedAt: string;
}
