import { DomainError } from '@domain/index.ts';
import { config } from '@infrastructure/config/index.ts';
import { PersistenceError } from '@infrastructure/errors/persistence.error.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	ERROR_CODES,
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

	const path = req.originalUrl || req.url;

	// 1. Zod validation error
	if (err instanceof ZodError) {
		logger.warn(
			{
				err,
				http: {
					method: req.method,
					path,
					status_code: HTTP_STATUS.BAD_REQUEST,
				},
			},
			'Validation error occurred',
		);

		const errors = err.issues.map((issue) => ({
			field: issue.path.join('.'),
			message: issue.message,
		}));

		sendErrorResponse(
			res,
			ERROR_CODES.VALIDATION_ERROR,
			QUEUE_MESSAGES.VALIDATION_FAILED,
			HTTP_STATUS.BAD_REQUEST,
			errors,
		);
		return;
	}

	// 2. Domain business error
	if (err instanceof DomainError) {
		const statusCode = mapDomainErrorToHttpStatus(err);
		logger.warn(
			{
				err,
				http: {
					method: req.method,
					path,
					status_code: statusCode,
				},
				...(err.details && typeof err.details === 'object' ? { context: err.details } : {}),
			},
			'Domain rule violation occurred',
		);

		sendErrorResponse(res, err.code, err.message, statusCode, err.details);
		return;
	}

	// 3. Database persistence error
	if (err instanceof PersistenceError) {
		logger.error(
			{
				err,
				http: {
					method: req.method,
					path,
					status_code: HTTP_STATUS.INTERNAL_SERVER_ERROR,
				},
				...(err.cause ? { context: { cause: String(err.cause) } } : {}),
			},
			'Database persistence error occurred',
		);

		sendErrorResponse(
			res,
			ERROR_CODES.DATABASE_ERROR,
			config.nodeEnv === 'production' ? MESSAGES.INTERNAL_SERVER_ERROR : err.message,
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
		);
		return;
	}

	// 4. Application / Unknown / Server error
	const statusCode =
		res.statusCode >= 400 && res.statusCode < 600
			? res.statusCode
			: HTTP_STATUS.INTERNAL_SERVER_ERROR;

	if (statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
		logger.error(
			{
				err,
				http: {
					method: req.method,
					path,
					status_code: statusCode,
				},
			},
			'Unhandled server error occurred',
		);
	} else {
		logger.warn(
			{
				err,
				http: {
					method: req.method,
					path,
					status_code: statusCode,
				},
			},
			'Client error occurred',
		);
	}

	const message = config.nodeEnv === 'production' ? MESSAGES.UNEXPECTED_ERROR : err.message;

	sendErrorResponse(res, MESSAGES.INTERNAL_SERVER_ERROR, message, statusCode);
}
