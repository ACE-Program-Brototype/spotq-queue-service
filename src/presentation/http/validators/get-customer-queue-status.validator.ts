import { VALIDATION_MESSAGES } from '@shared/constants/message.constants.ts';
import { z } from 'zod';

export const getCustomerQueueStatusParamsSchema = z
	.object({
		restaurantId: z.uuid({
			message: VALIDATION_MESSAGES.INVALID_RESTAURANT_ID_UUID,
		}),
	})
	.strict();

export const getCustomerQueueStatusQuerySchema = z
	.object({
		queueEntryId: z.uuid({
			message: VALIDATION_MESSAGES.INVALID_QUEUE_ENTRY_ID_UUID,
		}),
	})
	.strict();

export type GetCustomerQueueStatusParams = z.infer<typeof getCustomerQueueStatusParamsSchema>;
export type GetCustomerQueueStatusQuery = z.infer<typeof getCustomerQueueStatusQuerySchema>;
