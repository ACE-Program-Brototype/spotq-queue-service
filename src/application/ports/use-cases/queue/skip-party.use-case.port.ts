import type {
	SkipPartyInputDTO,
	SkipPartyOutputDTO,
} from '@application/dtos/queue/skip-party.dto.ts';

export interface ISkipPartyUseCase {
	execute(input: SkipPartyInputDTO): Promise<SkipPartyOutputDTO>;
}
