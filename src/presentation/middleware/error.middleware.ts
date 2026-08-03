import type { NextFunction, Request, Response } from 'express';
import { logger } from '../../infrastructure/logger/index.js';

export function errorMiddleware(
	err: Error,
	req: Request,
	res: Response,
	_next: NextFunction,
): void {
	logger.error({ err, method: req.method, url: req.url }, 'Unhandled error occurred');

	const statusCode = res.statusCode === 200 || res.statusCode === 304 ? 500 : res.statusCode;

	res.status(statusCode).json({
		error: 'Internal Server Error',
		message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
	});
}
