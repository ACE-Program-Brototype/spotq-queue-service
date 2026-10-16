import { DomainError } from '@domain/index.ts';
import { config } from '@infrastructure/config/index.ts';
import { PersistenceError } from '@infrastructure/errors/persistence.error.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	HTTP_STATUS,
	MESSAGES,
	mapDomainErrorToHttpStatus,
	QUEUE_MESSAGES,
	sendErrorResponse,
} from '@shared/index.ts';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

/**
 * Global Express error handling middleware.
 *
 * Responsibilities:
 * - Translates Zod validation errors into standardized 400 bad request responses.
 * - Translates DomainError instances into standardized client error responses (400, 403, 404, 409).
 * - Translates PersistenceError instances into safe 500 responses without leaking database internals.
 * - Catches unexpected runtime exceptions and provides masked production error messaging.
 */
export function errorMiddleware(
	err: Error,
	req: Request,
	res: Response,
	_next: NextFunction,
): void {
	if (res.headersSent) {
		return;
	}

	// 1. Zod schema validation errors
	if (err instanceof ZodError) {
		const errors = err.issues.map((issue) => ({
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

	// 2. Business domain errors (conflict, not found, forbidden, business rules)
	if (err instanceof DomainError) {
		const statusCode = mapDomainErrorToHttpStatus(err);
		logger.warn(
			{
				errName: err.name,
				code: err.code,
				statusCode,
				details: err.details,
				url: req.url,
				method: req.method,
			},
			`Domain rule violation: ${err.message}`,
		);

		sendErrorResponse(res, err.code, err.message, statusCode, err.details);
		return;
	}

	// 3. Repository & Database persistence infrastructure errors
	if (err instanceof PersistenceError) {
		logger.error(
			{ err, cause: err.cause, url: req.url, method: req.method },
			`Database persistence error: ${err.message}`,
		);

		sendErrorResponse(
			res,
			'DATABASE_ERROR',
			config.nodeEnv === 'production' ? MESSAGES.INTERNAL_SERVER_ERROR : err.message,
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
		);
		return;
	}

	// 4. Fallback for unhandled unexpected exceptions
	logger.error({ err, method: req.method, url: req.url }, MESSAGES.UNHANDLED_ERROR);

	const statusCode =
		res.statusCode >= 400 && res.statusCode < 600
			? res.statusCode
			: HTTP_STATUS.INTERNAL_SERVER_ERROR;

	const message = config.nodeEnv === 'production' ? MESSAGES.UNEXPECTED_ERROR : err.message;

	sendErrorResponse(res, MESSAGES.INTERNAL_SERVER_ERROR, message, statusCode);
}
