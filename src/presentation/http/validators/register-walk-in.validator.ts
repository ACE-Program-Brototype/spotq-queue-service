import { z } from 'zod';

export const registerWalkInParamsSchema = z.object({
	restaurantId: z.string().min(1, 'restaurantId is required'),
});

export const registerWalkInBodySchema = z.object({
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
		.min(1, 'partySize must be between 1 and 20')
		.max(20, 'partySize must be between 1 and 20'),
	specialNotes: z.string().trim().optional(),
});

export type RegisterWalkInParams = z.infer<typeof registerWalkInParamsSchema>;
export type RegisterWalkInBody = z.infer<typeof registerWalkInBodySchema>;
