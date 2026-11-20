import { QueueStatus } from '@domain/enums/queue.enums.ts';
import { VALIDATION_MESSAGES } from '@shared/constants/message.constants.ts';
import { PARTY_SIZE_BUCKET } from '@shared/constants/queue.constants.ts';
import { z } from 'zod';

export const getStaffQueueParamsSchema = z.object({
	restaurantId: z.uuid({
		message: VALIDATION_MESSAGES.INVALID_RESTAURANT_ID_UUID,
	}),
});

export const getStaffQueueQuerySchema = z.object({
	status: z.enum(QueueStatus).optional(),
	partySizeBucket: z.enum(PARTY_SIZE_BUCKET).optional(),
});

export type GetStaffQueueParams = z.infer<typeof getStaffQueueParamsSchema>;
export type GetStaffQueueQuery = z.infer<typeof getStaffQueueQuerySchema>;
