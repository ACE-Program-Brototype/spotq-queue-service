import type { SkipPartyInputDTO, SkipPartyOutputDTO } from '@application/dtos/skip-party.dto.ts';

export interface ISkipPartyUseCase {
	execute(input: SkipPartyInputDTO): Promise<SkipPartyOutputDTO>;
}
