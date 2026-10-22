import { z } from 'zod';

export const assignTablesParamsSchema = z.object({
	queueEntryId: z.string().uuid('Invalid queue entry ID format'),
});

export const assignTablesBodySchema = z
	.object({
		tables: z
			.array(
				z.object({
					tableId: z.string().uuid('Invalid table ID format'),
					count: z
						.number({
							message: 'count must be a valid number',
						})
						.int('count must be an integer')
						.positive('count must be a positive integer'),
				}),
			)
			.min(1, 'At least one table must be assigned'),
	})
	.superRefine(({ tables }, ctx) => {
		const seen = new Set<string>();
		tables.forEach((table, index) => {
			if (seen.has(table.tableId)) {
				ctx.addIssue({
					code: 'custom',
					path: ['tables', index, 'tableId'],
					message: 'Duplicate tableId detected in assignment list',
				});
			}
			seen.add(table.tableId);
		});
	});

export type AssignTablesParams = z.infer<typeof assignTablesParamsSchema>;
export type AssignTablesBody = z.infer<typeof assignTablesBodySchema>;
