import { randomUUID } from 'node:crypto';
import { type LoggerStore, logger, loggerLocalStorage } from '@infrastructure/logger/index.ts';
import type { NextFunction, Request, Response } from 'express';

export enum RequestHeader {
	CORRELATION_ID = 'x-correlation-id',
	REQUEST_ID = 'x-request-id',
	TRACE_ID = 'x-trace-id',
	SPAN_ID = 'x-span-id',
	TRACEPARENT = 'traceparent',
	USER_AGENT = 'user-agent',
}

function parseTraceparent(header?: string): {
	traceId?: string;
	spanId?: string;
} {
	if (!header) return {};
	const parts = header.split('-');
	if (parts.length >= 3 && parts[1] && parts[2]) {
		return { traceId: parts[1], spanId: parts[2] };
	}
	return {};
}

export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
	const correlationId =
		(req.headers[RequestHeader.CORRELATION_ID] as string) ||
		(req.headers[RequestHeader.REQUEST_ID] as string) ||
		randomUUID();
	const requestId = (req.headers[RequestHeader.REQUEST_ID] as string) || randomUUID();

	const traceparent = parseTraceparent(
		req.headers[RequestHeader.TRACEPARENT] as string | undefined,
	);
	const traceId =
		(req.headers[RequestHeader.TRACE_ID] as string) || traceparent.traceId || correlationId;
	const spanId = (req.headers[RequestHeader.SPAN_ID] as string) || traceparent.spanId;

	res.setHeader(RequestHeader.CORRELATION_ID, correlationId);
	res.setHeader(RequestHeader.REQUEST_ID, requestId);
	if (traceId) {
		res.setHeader(RequestHeader.TRACE_ID, traceId);
	}

	const store: LoggerStore = {
		requestId,
		correlationId,
		...(traceId ? { traceId } : {}),
		...(spanId ? { spanId } : {}),
	};

	loggerLocalStorage.run(store, () => {
		const startTime = process.hrtime.bigint();
		const path = req.originalUrl || req.url;

		logger.debug(
			{
				http: {
					method: req.method,
					path,
					client_ip: req.ip || req.socket.remoteAddress,
				},
				headers: {
					host: req.headers.host,
					userAgent: req.headers[RequestHeader.USER_AGENT],
				},
			},
			'Incoming request',
		);

		res.on('finish', () => {
			const endTime = process.hrtime.bigint();
			const durationMs = Math.round((Number(endTime - startTime) / 1_000_000) * 10) / 10;

			logger.info(
				{
					http: {
						method: req.method,
						path,
						status_code: res.statusCode,
						duration_ms: durationMs,
						client_ip: req.ip || req.socket.remoteAddress,
					},
				},
				`HTTP ${req.method} ${path} ${res.statusCode} (${durationMs}ms)`,
			);
		});

		next();
	});
}
