import type { NextFunction, Request, Response } from 'express';

export function notFoundMiddleware(req: Request, res: Response, _next: NextFunction): void {
	res.status(404).json({
		error: 'Not Found',
		message: `Cannot ${req.method} ${req.path}`,
	});
}
