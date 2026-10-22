import { z } from 'zod';

export const ringCustomerParamsSchema = z.object({
	queueEntryId: z.string().uuid('Invalid queue entry ID format'),
});

export type RingCustomerParams = z.infer<typeof ringCustomerParamsSchema>;
