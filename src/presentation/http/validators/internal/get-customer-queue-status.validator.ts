import { messages } from '@shared/constants';
import z from 'zod';

export const getCustomerQueueStatusBodySchema = z.object({
	userId: z.string().uuid(messages.INVALID_USER_ID_UUID),
});

export type GetCustomerQueueStatusBody = z.infer<typeof getCustomerQueueStatusBodySchema>;
