import type { NextFunction, Request, Response } from 'express';
import { httpRequestCounter, httpRequestDuration } from '../../infrastructure/metrics/index.ts';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
	const end = httpRequestDuration.startTimer();

	res.on('finish', () => {
		const route = req.route ? req.route.path : req.path;
		const labels = {
			method: req.method,
			route,
			status_code: res.statusCode.toString(),
		};

		end(labels);
		httpRequestCounter.inc(labels);
	});

	next();
}
