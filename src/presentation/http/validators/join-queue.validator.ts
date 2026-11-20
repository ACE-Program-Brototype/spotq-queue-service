import { PARTY_SIZE_LIMITS, QUEUE_LIMITS, REGEX } from '@shared/index.ts';
import { z } from 'zod';

export const joinQueueParamsSchema = z.object({
	restaurantId: z.string().uuid('Invalid restaurant ID format'),
});

export const joinQueueBodySchema = z.object({
	guestName: z
		.string()
		.trim()
		.min(1, 'guestName is required and cannot be empty')
		.max(
			QUEUE_LIMITS.GUEST_NAME.MAX,
			`guestName must not exceed ${QUEUE_LIMITS.GUEST_NAME.MAX} characters`,
		),
	guestPhone: z
		.string()
		.trim()
		.regex(
			REGEX.E164_PHONE,
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
	specialNotes: z
		.string()
		.trim()
		.max(
			QUEUE_LIMITS.SPECIAL_NOTES.MAX,
			`specialNotes must not exceed ${QUEUE_LIMITS.SPECIAL_NOTES.MAX} characters`,
		)
		.optional()
		.nullable()
		.transform((val) => (val && val.length > 0 ? val : null)),
	fid: z
		.string()
		.trim()
		.optional()
		.nullable()
		.transform((val) => (val && val.length > 0 ? val : null)),
});

export type JoinQueueParams = z.infer<typeof joinQueueParamsSchema>;
export type JoinQueueBody = z.infer<typeof joinQueueBodySchema>;
