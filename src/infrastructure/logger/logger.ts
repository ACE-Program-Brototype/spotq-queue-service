import pino, { type DestinationStream, type LoggerOptions } from 'pino';
import { config } from '../config/env.ts';
import { loggerLocalStorage } from './logger-context.ts';

export interface LogHttpInfo {
	method: string;
	path: string;
	status_code?: number;
	duration_ms?: number;
	client_ip?: string;
}

export interface LogErrorInfo {
	name: string;
	code?: string;
	message: string;
	stack?: string;
}

export interface LogJobInfo {
	queue: string;
	routing_key?: string;
	job_id?: string;
	duration_ms?: number;
	status: string;
}

export interface LogEventInfo {
	action: string;
	[key: string]: unknown;
}

const CONTEXT_FIELD_MAP: Record<string, string> = {
	userId: 'user_id',
	user_id: 'user_id',
	customerId: 'customer_id',
	customer_id: 'customer_id',
	orderId: 'order_id',
	order_id: 'order_id',
	restaurantId: 'restaurant_id',
	restaurant_id: 'restaurant_id',
	queueEntryId: 'queue_entry_id',
	queue_entry_id: 'queue_entry_id',
	ticketId: 'queue_entry_id',
	ticket_id: 'queue_entry_id',
	queueId: 'queue_id',
	queue_id: 'queue_id',
	tableId: 'table_id',
	table_id: 'table_id',
	email: 'email',
	phone: 'phone',
	phoneNumber: 'phone_number',
	phone_number: 'phone_number',
	deviceId: 'device_id',
	device_id: 'device_id',
	jobId: 'job_id',
	job_id: 'job_id',
	socketId: 'socket_id',
	socket_id: 'socket_id',
	room: 'room',
};

function formatErrorObject(err: unknown): LogErrorInfo | undefined {
	if (!err) return undefined;
	if (err instanceof Error) {
		const code = (err as { code?: string }).code;
		return {
			name: err.name || 'Error',
			...(code ? { code: String(code) } : {}),
			message: err.message,
			...(err.stack ? { stack: err.stack } : {}),
		};
	}
	if (typeof err === 'object') {
		const errObj = err as Record<string, unknown>;
		return {
			name: String(errObj.name || errObj.errName || 'Error'),
			...(errObj.code || errObj.errCode ? { code: String(errObj.code || errObj.errCode) } : {}),
			message: String(errObj.message || 'Unknown error'),
			...(errObj.stack ? { stack: String(errObj.stack) } : {}),
		};
	}
	return {
		name: 'Error',
		message: String(err),
	};
}

export const loggerOptions: LoggerOptions = {
	level: config.service?.logLevel || config.logLevel || 'info',
	base: undefined,
	timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
	messageKey: 'message',
	formatters: {
		level: (label) => ({ level: label.toUpperCase() }),
		log: (rawObj: Record<string, unknown>) => {
			const {
				err,
				error,
				event,
				http,
				job,
				context: explicitContext,
				trace: explicitTrace,
				...rest
			} = rawObj;

			// Handle legacy msg field if message is not present
			if (rest.msg && !rest.message) {
				rest.message = rest.msg;
				delete rest.msg;
			}

			delete rest.serviceName;

			const store = loggerLocalStorage.getStore();

			// 1. Build Trace block
			const trace: Record<string, unknown> = {
				...(store?.correlationId
					? { correlation_id: store.correlationId }
					: rest.correlationId
						? { correlation_id: rest.correlationId }
						: rest.requestId
							? { correlation_id: rest.requestId }
							: {}),
				...(store?.traceId
					? { trace_id: store.traceId }
					: rest.traceId
						? { trace_id: rest.traceId }
						: {}),
				...(store?.spanId
					? { span_id: store.spanId }
					: rest.spanId
						? { span_id: rest.spanId }
						: {}),
				...(explicitTrace && typeof explicitTrace === 'object' ? explicitTrace : {}),
			};

			delete rest.correlationId;
			delete rest.requestId;
			delete rest.traceId;
			delete rest.spanId;

			// 2. Build Context block (mapping dynamic IDs into context)
			const context: Record<string, unknown> = {
				...(explicitContext && typeof explicitContext === 'object' ? explicitContext : {}),
			};

			for (const [key, target] of Object.entries(CONTEXT_FIELD_MAP)) {
				if (key in rest && rest[key] !== undefined) {
					context[target] = rest[key];
					delete rest[key];
				}
			}

			// 3. Build Error block
			const errorInfo = formatErrorObject(error || err);

			// 4. Build Event block
			let eventInfo: LogEventInfo | undefined;
			if (event) {
				eventInfo = typeof event === 'string' ? { action: event } : (event as LogEventInfo);
			}

			// 5. Build Service block
			const serviceInfo = {
				name: config.service?.name || config.serviceName,
				version: config.service?.version || '1.0.0',
				environment: config.nodeEnv,
			};

			return {
				service: serviceInfo,
				...(Object.keys(trace).length > 0 ? { trace } : {}),
				...(http && typeof http === 'object' ? { http } : {}),
				...(errorInfo ? { error: errorInfo } : {}),
				...(eventInfo ? { event: eventInfo } : {}),
				...(job && typeof job === 'object' ? { job } : {}),
				...(Object.keys(context).length > 0 ? { context } : {}),
				...rest,
			};
		},
	},
	redact: {
		paths: [
			'authorization',
			'cookie',
			'password',
			'passwordHash',
			'token',
			'accessToken',
			'refreshToken',
			'tempToken',
			'otp',
			'razorpay_signature',
			'razorpaySignature',
			'cardNumber',
			'card_number',
			'cvv',
			'headers.authorization',
			'headers.cookie',
			'req.headers.authorization',
			'req.headers.cookie',
			'context.password',
			'context.passwordHash',
			'context.token',
			'context.otp',
			'context.razorpay_signature',
			'context.card_number',
			'context.cvv',
			'*.password',
			'*.passwordHash',
			'*.token',
			'*.accessToken',
			'*.refreshToken',
			'*.tempToken',
			'*.otp',
			'*.razorpay_signature',
			'*.cardNumber',
			'*.card_number',
			'*.cvv',
		],
		censor: '[REDACTED]',
	},
	serializers: {
		err: pino.stdSerializers.err,
	},
};

export function createLogger(destination?: DestinationStream) {
	return destination ? pino(loggerOptions, destination) : pino(loggerOptions);
}

export const logger = createLogger();
