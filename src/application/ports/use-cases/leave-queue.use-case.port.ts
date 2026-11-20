import type { LeaveQueueInputDTO, LeaveQueueOutputDTO } from '@application/dtos/leave-queue.dto.ts';

export interface ILeaveQueueUseCase {
	execute(input: LeaveQueueInputDTO): Promise<LeaveQueueOutputDTO>;
}
