import { VALIDATION_MESSAGES } from '@shared/constants/message.constants.ts';
import { z } from 'zod';

export const seatPartyParamsSchema = z.object({
	restaurantId: z.uuid({
		message: VALIDATION_MESSAGES.INVALID_RESTAURANT_ID_UUID,
	}),
	queueEntryId: z.uuid({
		message: VALIDATION_MESSAGES.INVALID_QUEUE_ENTRY_ID_UUID,
	}),
});

export const seatPartyBodySchema = z
	.object({
		tableIds: z
			.array(
				z.string().min(1, {
					message: VALIDATION_MESSAGES.INVALID_TABLE_ID_UUID,
				}),
			)
			.min(1, {
				message: VALIDATION_MESSAGES.TABLE_IDS_REQUIRED,
			}),
	})
	.strict()
	.superRefine(({ tableIds }, ctx) => {
		const seen = new Set<string>();
		tableIds.forEach((tableId, index) => {
			if (seen.has(tableId)) {
				ctx.addIssue({
					code: 'custom',
					path: ['tableIds', index],
					message: 'Duplicate tableId detected in assignment list',
				});
			}
			seen.add(tableId);
		});
	});

export type SeatPartyParams = z.infer<typeof seatPartyParamsSchema>;
export type SeatPartyBody = z.infer<typeof seatPartyBodySchema>;
