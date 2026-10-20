import type { QueueStatus } from '@domain/index.ts';

export interface GetActiveQueueByUserInputDto {
	restaurantId: string;
	userId: string;
}

export interface ActiveQueueDetailsDto {
	id: string;
	restaurantId: string;
	userId: string | null;
	queueNumber: string;
	partySize: number;
	status: QueueStatus;
	position: number | null;
	estimatedWaitMinutes: number | null;
	joinedAt: Date;
}

export interface GetActiveQueueByUserResponseDto {
	hasActiveQueue: boolean;
	queueEntry: ActiveQueueDetailsDto | null;
}
