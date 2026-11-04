import type {
	SeatPartyInputDTO,
	SeatPartyOutputDTO,
} from '@application/dtos/queue/seat-party.dto.ts';

export interface ISeatPartyUseCase {
	execute(input: SeatPartyInputDTO): Promise<SeatPartyOutputDTO>;
}
