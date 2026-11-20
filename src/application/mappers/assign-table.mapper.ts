import type { AssignTablesOutputDTO } from '@application/dtos/assign-table.dto.ts';
import type { MlEtaTrainingEvent } from '@application/ports/services/rabbitmq-service.port.ts';
import type { QueueEntry } from '@domain/entities/queue-entry.entity.ts';

export const AssignTableMapper = {
	toOutputDTO(entry: QueueEntry, tableIds: string[]): AssignTablesOutputDTO {
		return {
			queueEntryId: entry.id,
			restaurantId: entry.restaurantId,
			tableIds,
			status: entry.status,
			seatedAt: (entry.seatedAt ?? new Date()).toISOString(),
		};
	},

	toMlEtaTrainingEvent(entry: QueueEntry, totalPeopleAheadAtJoin: number): MlEtaTrainingEvent {
		return {
			queue_entry_id: entry.id,
			restaurant_id: entry.restaurantId,
			party_size: entry.partySize,
			joined_at: entry.joinedAt.toISOString(),
			seated_at: (entry.seatedAt ?? new Date()).toISOString(),
			total_people_ahead_at_join: totalPeopleAheadAtJoin,
		};
	},
};
