import { randomUUID } from 'node:crypto';
import { logger, loggerLocalStorage } from '@infrastructure/logger/index.ts';
import { MESSAGES } from '@shared/constants/index.ts';
import type { NextFunction, Request, Response } from 'express';

export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
	const correlationId =
		(req.headers['x-correlation-id'] as string) ||
		(req.headers['x-request-id'] as string) ||
		randomUUID();
	const requestId = randomUUID();
	const traceId = correlationId;

	res.setHeader('x-correlation-id', correlationId);
	res.setHeader('x-request-id', requestId);
	res.setHeader('x-trace-id', traceId);

	const store = { requestId, correlationId, traceId };

	loggerLocalStorage.run(store, () => {
		logger.info({
			msg: MESSAGES.INCOMING_REQUEST,
			method: req.method,
			url: req.url,
			ip: req.ip,
			headers: {
				host: req.headers.host,
				userAgent: req.headers['user-agent'],
			},
		});

		const startTime = Date.now();

		res.on('finish', () => {
			const duration = Date.now() - startTime;
			logger.info({
				msg: MESSAGES.REQUEST_COMPLETED,
				method: req.method,
				url: req.url,
				statusCode: res.statusCode,
				responseTimeMs: duration,
			});
		});

		next();
	});
}
