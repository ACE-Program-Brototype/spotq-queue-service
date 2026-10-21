import { VALIDATION_MESSAGES } from '@shared/constants/message.constants.ts';
import { z } from 'zod';

export const getUserActiveQueueParamsSchema = z.object({
	restaurantId: z.string().uuid({ message: VALIDATION_MESSAGES.INVALID_RESTAURANT_ID_UUID }),
	userId: z.string().uuid({ message: VALIDATION_MESSAGES.INVALID_USER_ID_UUID }),
});

export type GetUserActiveQueueParams = z.infer<typeof getUserActiveQueueParamsSchema>;
