import { messages } from '@shared/constants';
import z from 'zod';

export const getCustomerQueueStatusParamsSchema = z.object({
	userId: z.string().uuid(messages.INVALID_USER_ID_UUID),
});

export type GetCustomerQueueStatusParams = z.infer<typeof getCustomerQueueStatusParamsSchema>;
