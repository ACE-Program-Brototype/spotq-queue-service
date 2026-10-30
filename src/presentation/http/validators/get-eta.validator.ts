import { PARTY_SIZE_LIMITS } from '@shared/index.ts';
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
		.min(
			PARTY_SIZE_LIMITS.MIN,
			`partySize must be between ${PARTY_SIZE_LIMITS.MIN} and ${PARTY_SIZE_LIMITS.MAX}`,
		)
		.max(
			PARTY_SIZE_LIMITS.MAX,
			`partySize must be between ${PARTY_SIZE_LIMITS.MIN} and ${PARTY_SIZE_LIMITS.MAX}`,
		),
});

export type GetEtaParams = z.infer<typeof getEtaParamsSchema>;
export type GetEtaQuery = z.infer<typeof getEtaQuerySchema>;
