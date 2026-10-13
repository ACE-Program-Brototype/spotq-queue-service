import { ErrorResponse, HTTP_STATUS, MESSAGES } from '@shared/index.ts';
import type { NextFunction, Request, Response } from 'express';

export function notFoundMiddleware(req: Request, res: Response, _next: NextFunction): void {
	res
		.status(HTTP_STATUS.NOT_FOUND)
		.json(new ErrorResponse(MESSAGES.NOT_FOUND, `Cannot ${req.method} ${req.path}`));
}
