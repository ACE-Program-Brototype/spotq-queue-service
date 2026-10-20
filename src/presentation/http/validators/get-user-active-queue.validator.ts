import { z } from 'zod';

export const getUserActiveQueueParamsSchema = z.object({
	restaurantId: z.string().uuid({ message: 'restaurantId must be a valid UUID' }),
	userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
});

export type GetUserActiveQueueParams = z.infer<typeof getUserActiveQueueParamsSchema>;
