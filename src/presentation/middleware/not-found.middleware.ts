import { HTTP_STATUS, MESSAGES } from '@shared/constants/index.ts';
import type { NextFunction, Request, Response } from 'express';

export function notFoundMiddleware(req: Request, res: Response, _next: NextFunction): void {
	res.status(HTTP_STATUS.NOT_FOUND).json({
		error: MESSAGES.NOT_FOUND,
		message: `Cannot ${req.method} ${req.path}`,
	});
}
