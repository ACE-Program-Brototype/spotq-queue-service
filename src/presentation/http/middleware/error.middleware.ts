import { logger } from '@infrastructure/logger/index.ts';
import { ErrorResponse, HTTP_STATUS, MESSAGES } from '@shared/index.ts';
import type { NextFunction, Request, Response } from 'express';

export function errorMiddleware(
	err: Error,
	req: Request,
	res: Response,
	_next: NextFunction,
): void {
	logger.error({ err, method: req.method, url: req.url }, MESSAGES.UNHANDLED_ERROR);

	const statusCode =
		res.statusCode === HTTP_STATUS.OK || res.statusCode === HTTP_STATUS.NOT_MODIFIED
			? HTTP_STATUS.INTERNAL_SERVER_ERROR
			: res.statusCode;

	const message = process.env.NODE_ENV === 'production' ? MESSAGES.UNEXPECTED_ERROR : err.message;

	res.status(statusCode).json(new ErrorResponse(MESSAGES.INTERNAL_SERVER_ERROR, message));
}
