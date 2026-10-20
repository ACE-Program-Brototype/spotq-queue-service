import { z } from 'zod';

export const getEtaParamsSchema = z.object({
	restaurantId: z.string().uuid('Invalid restaurant ID format'),
});

export const getEtaQuerySchema = z.object({
	partySize: z.coerce
		.number({
			message: 'partySize must be a valid number',
		})
		.int('partySize must be an integer')
		.min(1, 'partySize must be between 1 and 20')
		.max(20, 'partySize must be between 1 and 20'),
});

export type GetEtaParams = z.infer<typeof getEtaParamsSchema>;
export type GetEtaQuery = z.infer<typeof getEtaQuerySchema>;
