import { ERROR_CODES, HTTP_STATUS, QUEUE_MESSAGES, sendErrorResponse } from '@shared/index.ts';
import type { NextFunction, Request, Response } from 'express';
import type { ZodIssue, ZodSchema } from 'zod';

export interface FormattedValidationError {
	field: string;
	message: string;
}

export function formatZodIssues(issues: ZodIssue[]): FormattedValidationError[] {
	return issues.map((issue) => ({
		field: issue.path.join('.'),
		message: issue.message,
	}));
}

export function validateBody<T>(schema: ZodSchema<T>) {
	return (req: Request, res: Response, next: NextFunction): void => {
		const result = schema.safeParse(req.body);
		if (!result.success) {
			const errors = formatZodIssues(result.error.issues);

			sendErrorResponse(
				res,
				ERROR_CODES.VALIDATION_ERROR,
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

export function validateParams<T>(schema: ZodSchema<T>) {
	return (req: Request, res: Response, next: NextFunction): void => {
		const result = schema.safeParse(req.params);
		if (!result.success) {
			const errors = formatZodIssues(result.error.issues);

			sendErrorResponse(
				res,
				ERROR_CODES.INVALID_PARAMETERS,
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

export function validateQuery<T>(schema: ZodSchema<T>) {
	return (req: Request, res: Response, next: NextFunction): void => {
		const result = schema.safeParse(req.query);
		if (!result.success) {
			const errors = formatZodIssues(result.error.issues);

			sendErrorResponse(
				res,
				ERROR_CODES.INVALID_PARAMETERS,
				QUEUE_MESSAGES.INVALID_PARAMETERS,
				HTTP_STATUS.BAD_REQUEST,
				errors,
			);
			return;
		}

		Object.defineProperty(req, 'query', {
			value: result.data,
			writable: true,
			enumerable: true,
			configurable: true,
		});
		next();
	};
}
