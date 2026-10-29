import type { RegisterQueueOutputDTO } from '@application/dtos/register-queue.dto.ts';
import type { QueueEntry } from '@domain/entities/queue-entry.entity.ts';

/**
 * Mapper for converting domain QueueEntry instances to RegisterQueueOutputDTO.
 */
export const RegisterQueueMapper = {
	/**
	 * Maps a domain QueueEntry entity into RegisterQueueOutputDTO.
	 *
	 * @param entry - Persisted domain QueueEntry
	 * @returns Standardized output DTO
	 */
	toOutputDTO(entry: QueueEntry): RegisterQueueOutputDTO {
		return {
			queueEntryId: entry.id,
			restaurantId: entry.restaurantId,
			userId: entry.userId ?? null,
			guestName: entry.guestName,
			guestPhone: entry.phone,
			queueNumber: entry.queueNumber,
			partySize: entry.partySize,
			specialNotes: entry.specialNotes ?? null,
			registrationType: entry.registrationType,
			position: entry.position ?? 0,
			estimatedWaitMinutes: entry.estimatedWaitMinutes ?? 0,
			status: entry.status,
			joinedAt: entry.joinedAt.toISOString(),
		};
	},
};
