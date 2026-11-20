import pino from 'pino';
import { config } from '../config/env.ts';
import { loggerLocalStorage } from './logger-context.ts';

export const logger = pino({
	level: config.logLevel,
	formatters: {
		level(label) {
			return { level: label.toUpperCase() };
		},
	},
	timestamp: pino.stdTimeFunctions.isoTime,
	mixin() {
		const store = loggerLocalStorage.getStore();
		if (!store) return {};

		return {
			serviceName: config.serviceName,
			requestId: store.requestId,
			correlationId: store.correlationId,
			traceId: store.traceId,
		};
	},
});
