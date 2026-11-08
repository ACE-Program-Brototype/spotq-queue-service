import { z } from 'zod';

export const getCustomerQueueStatusParamsSchema = z.object({
	restaurantId: z.string().uuid('Invalid restaurant ID format'),
});

export const getCustomerQueueStatusQuerySchema = z.object({
	queueEntryId: z.string().uuid('Invalid queue entry ID format'),
});

export type GetCustomerQueueStatusParams = z.infer<typeof getCustomerQueueStatusParamsSchema>;
export type GetCustomerQueueStatusQuery = z.infer<typeof getCustomerQueueStatusQuerySchema>;
