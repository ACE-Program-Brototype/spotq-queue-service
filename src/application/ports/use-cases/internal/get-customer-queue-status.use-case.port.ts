import type {
	GetCustomerQueueStatusInputDTO,
	GetCustomerQueueStatusOutputDTO,
} from '@application/dtos/internal/get-customer-queue-status.dto';

export interface IGetCustomerQueueStatusUseCase {
	execute(input: GetCustomerQueueStatusInputDTO): Promise<GetCustomerQueueStatusOutputDTO | null>;
}
