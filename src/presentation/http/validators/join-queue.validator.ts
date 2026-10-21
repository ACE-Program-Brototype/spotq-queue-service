import { PARTY_SIZE_LIMITS } from '@shared/index.ts';
import { z } from 'zod';

export const joinQueueParamsSchema = z.object({
	restaurantId: z.string().uuid('Invalid restaurant ID format'),
});

export const joinQueueBodySchema = z.object({
	guestName: z.string().trim().min(1, 'guestName is required and cannot be empty'),
	guestPhone: z
		.string()
		.trim()
		.regex(
			/^\+[1-9]\d{1,14}$/,
			'guestPhone must be a valid phone number in E.164 format (e.g., +15559876543)',
		),
	partySize: z
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
	specialNotes: z.string().trim().optional(),
	fid: z.string().trim().optional().nullable(),
});

export type JoinQueueParams = z.infer<typeof joinQueueParamsSchema>;
export type JoinQueueBody = z.infer<typeof joinQueueBodySchema>;
