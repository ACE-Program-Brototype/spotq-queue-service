import type {
	GetCustomerQueueStatusSnapshotInputDTO,
	GetCustomerQueueStatusSnapshotOutputDTO,
} from '@application/dtos/get-customer-queue-status-snapshot.dto.ts';

export interface IGetCustomerQueueStatusSnapshotUseCase {
	execute(
		input: GetCustomerQueueStatusSnapshotInputDTO,
	): Promise<GetCustomerQueueStatusSnapshotOutputDTO>;
}
