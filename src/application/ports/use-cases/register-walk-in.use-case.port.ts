import type {
	RegisterWalkInInputDTO,
	RegisterWalkInOutputDTO,
} from '@application/dtos/register-walk-in.dto.ts';

/**
 * Port interface defining the contract for the RegisterWalkIn use case.
 *
 * Decouples presentation controllers from the concrete use case implementation,
 * adhering to the Dependency Inversion Principle (DIP) and hexagonal/clean architecture.
 */
export interface IRegisterWalkInUseCase {
	/**
	 * Executes walk-in registration pipeline.
	 *
	 * @param input - Walk-in registration payload including guest details and party size
	 * @returns Walk-in queue entry confirmation details
	 */
	execute(input: RegisterWalkInInputDTO): Promise<RegisterWalkInOutputDTO>;
}
