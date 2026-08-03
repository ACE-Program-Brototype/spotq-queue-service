import type { NextFunction, Request, Response } from 'express';
import { httpRequestCounter, httpRequestDuration } from '../../infrastructure/metrics/index.js';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
	// Skip metrics and health check paths to prevent spamming metrics logs
	if (req.path === '/metrics' || req.path === '/health') {
		next();
		return;
	}

	const startTime = process.hrtime();

	res.on('finish', () => {
		const durationDiff = process.hrtime(startTime);
		const durationSeconds = durationDiff[0] + durationDiff[1] / 1e9;

		const route = req.route?.path || req.path;
		const statusCode = String(res.statusCode);
		const method = req.method;

		httpRequestCounter.inc({ method, route, status_code: statusCode });
		httpRequestDuration.observe({ method, route, status_code: statusCode }, durationSeconds);
	});

	next();
}
