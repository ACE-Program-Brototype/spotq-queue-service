import { logger } from '@infrastructure/logger/index.js';
import { HTTP_STATUS, MESSAGES } from '@shared/constants/index.js';
import type { NextFunction, Request, Response } from 'express';

export function errorMiddleware(
	err: Error,
	req: Request,
	res: Response,
	_next: NextFunction,
): void {
	logger.error({ err, method: req.method, url: req.url }, MESSAGES.UNHANDLED_ERROR);

	const statusCode =
		res.statusCode === HTTP_STATUS.OK || res.statusCode === 304
			? HTTP_STATUS.INTERNAL_SERVER_ERROR
			: res.statusCode;

	res.status(statusCode).json({
		error: MESSAGES.INTERNAL_SERVER_ERROR,
		message: process.env.NODE_ENV === 'production' ? MESSAGES.UNEXPECTED_ERROR : err.message,
	});
}
