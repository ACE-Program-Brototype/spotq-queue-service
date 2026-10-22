import type {
	GetQueueEtaInputDTO,
	GetQueueEtaOutputDTO,
} from '@application/dtos/get-queue-eta.dto.ts';

export interface IGetQueueEtaUseCase {
	execute(input: GetQueueEtaInputDTO): Promise<GetQueueEtaOutputDTO>;
}
