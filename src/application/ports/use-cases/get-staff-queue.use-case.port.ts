import type {
	GetStaffQueueInputDTO,
	GetStaffQueueOutputDTO,
} from '@application/dtos/get-staff-queue.dto.ts';

export interface IGetStaffQueueUseCase {
	execute(input: GetStaffQueueInputDTO): Promise<GetStaffQueueOutputDTO>;
}
