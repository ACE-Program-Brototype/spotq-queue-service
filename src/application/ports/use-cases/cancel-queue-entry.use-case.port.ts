import type {
	CancelQueueEntryInputDTO,
	CancelQueueEntryOutputDTO,
} from '@application/dtos/cancel-queue-entry.dto.ts';

export interface ICancelQueueEntryUseCase {
	execute(input: CancelQueueEntryInputDTO): Promise<CancelQueueEntryOutputDTO>;
}
