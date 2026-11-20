import type {
	RingCustomerInputDTO,
	RingCustomerOutputDTO,
} from '@application/dtos/ring-customer.dto.ts';

export interface IRingCustomerUseCase {
	execute(input: RingCustomerInputDTO): Promise<RingCustomerOutputDTO>;
}
