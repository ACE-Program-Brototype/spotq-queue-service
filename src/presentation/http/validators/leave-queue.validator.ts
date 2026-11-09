import { z } from 'zod';

export const leaveQueueParamsSchema = z.object({
	restaurantId: z.string().uuid('Invalid restaurant ID format'),
});

export const leaveQueueBodySchema = z.object({
	queueEntryId: z.string().uuid('Invalid queue entry ID format'),
});

export type LeaveQueueParams = z.infer<typeof leaveQueueParamsSchema>;
export type LeaveQueueBody = z.infer<typeof leaveQueueBodySchema>;
