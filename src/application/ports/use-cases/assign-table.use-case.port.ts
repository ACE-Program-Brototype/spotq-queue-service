import type {
	AssignTablesInputDTO,
	AssignTablesOutputDTO,
} from '@application/dtos/assign-table.dto.ts';

export interface IAssignTableUseCase {
	execute(input: AssignTablesInputDTO): Promise<AssignTablesOutputDTO>;
}
