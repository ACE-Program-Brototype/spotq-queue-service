import { VALIDATION_MESSAGES } from '@shared/constants/message.constants.ts';
import { z } from 'zod';

export const skipPartyParamsSchema = z.object({
	restaurantId: z.uuid({
		message: VALIDATION_MESSAGES.INVALID_RESTAURANT_ID_UUID,
	}),
	queueEntryId: z.uuid({
		message: VALIDATION_MESSAGES.INVALID_QUEUE_ENTRY_ID_UUID,
	}),
});

export const skipPartyBodySchema = z
	.object({
		reason: z.string().trim().min(1, {
			message: VALIDATION_MESSAGES.SKIP_REASON_REQUIRED,
		}),
		skipPositions: z.number().int().positive().optional(),
	})
	.strict();

export type SkipPartyParams = z.infer<typeof skipPartyParamsSchema>;
export type SkipPartyBody = z.infer<typeof skipPartyBodySchema>;
