import { HTTP_STATUS, QUEUE_MESSAGES, sendErrorResponse } from '@shared/index.ts';
import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Express middleware generator validating request body payloads against a Zod schema.
 *
 * @param schema - Zod validation schema
 * @returns Express middleware function
 */
export function validateBody<T>(schema: ZodSchema<T>) {
	return (req: Request, res: Response, next: NextFunction): void => {
		const result = schema.safeParse(req.body);
		if (!result.success) {
			const errors = result.error.issues.map((issue) => ({
				field: issue.path.join('.'),
				message: issue.message,
			}));

			sendErrorResponse(
				res,
				'VALIDATION_ERROR',
				QUEUE_MESSAGES.VALIDATION_FAILED,
				HTTP_STATUS.BAD_REQUEST,
				errors,
			);
			return;
		}

		req.body = result.data;
		next();
	};
}

/**
 * Express middleware generator validating request URL parameters against a Zod schema.
 *
 * @param schema - Zod validation schema
 * @returns Express middleware function
 */
export function validateParams<T>(schema: ZodSchema<T>) {
	return (req: Request, res: Response, next: NextFunction): void => {
		const result = schema.safeParse(req.params);
		if (!result.success) {
			const errors = result.error.issues.map((issue) => ({
				field: issue.path.join('.'),
				message: issue.message,
			}));

			sendErrorResponse(
				res,
				'INVALID_PARAMETERS',
				QUEUE_MESSAGES.INVALID_PARAMETERS,
				HTTP_STATUS.BAD_REQUEST,
				errors,
			);
			return;
		}

		req.params = result.data as unknown as Record<string, string>;
		next();
	};
}
