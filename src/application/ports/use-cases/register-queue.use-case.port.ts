import type {
	RegisterQueueInputDTO,
	RegisterQueueOutputDTO,
} from '@application/dtos/register-queue.dto.ts';

/**
 * Port contract for registering into the restaurant queue (online or walk-in).
 */
export interface IRegisterQueueUseCase {
	execute(input: RegisterQueueInputDTO): Promise<RegisterQueueOutputDTO>;
}
