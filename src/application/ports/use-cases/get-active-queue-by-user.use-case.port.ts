import type {
	GetActiveQueueByUserInputDto,
	GetActiveQueueByUserResponseDto,
} from '@application/dtos/get-active-queue-by-user.dto.ts';

export interface IGetActiveQueueByUserUseCase {
	execute(input: GetActiveQueueByUserInputDto): Promise<GetActiveQueueByUserResponseDto>;
}
