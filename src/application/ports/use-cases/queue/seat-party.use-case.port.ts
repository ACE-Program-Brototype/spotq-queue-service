import type { SeatPartyInputDTO, SeatPartyOutputDTO } from '@application/dtos/seat-party.dto.ts';

export interface ISeatPartyUseCase {
	execute(input: SeatPartyInputDTO): Promise<SeatPartyOutputDTO>;
}
