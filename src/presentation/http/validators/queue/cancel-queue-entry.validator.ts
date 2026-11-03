import { QueueCancelReason } from '@domain/enums/queue.enums.ts';
import { VALIDATION_MESSAGES } from '@shared/constants/message.constants.ts';
import { z } from 'zod';

export const cancelQueueEntryParamsSchema = z.object({
	restaurantId: z.uuid({
		message: VALIDATION_MESSAGES.INVALID_RESTAURANT_ID_UUID,
	}),
	queueEntryId: z.uuid({
		message: VALIDATION_MESSAGES.INVALID_QUEUE_ENTRY_ID_UUID,
	}),
});

export const cancelQueueEntryBodySchema = z
	.object({
		reason: z
			.string()
			.trim()
			.toUpperCase()
			.refine((val) => Object.values(QueueCancelReason).includes(val as QueueCancelReason), {
				message: VALIDATION_MESSAGES.INVALID_CANCEL_REASON,
			}),
		notes: z.string().trim().max(500).optional(),
	})
	.strict();

export type CancelQueueEntryParams = z.infer<typeof cancelQueueEntryParamsSchema>;
export type CancelQueueEntryBody = z.infer<typeof cancelQueueEntryBodySchema>;
