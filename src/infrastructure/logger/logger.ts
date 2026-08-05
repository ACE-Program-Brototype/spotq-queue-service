import pino from 'pino';
import { config } from '../config/env.js';
import { loggerLocalStorage } from './logger-context.js';

export const logger = pino({
	level: config.service.logLevel || 'info',
	timestamp: pino.stdTimeFunctions.isoTime,
	formatters: {
		level: (label) => {
			return { level: label.toUpperCase() };
		},
	},
	mixin() {
		const store = loggerLocalStorage.getStore();
		return {
			serviceName: config.service.name,
			...(store
				? {
						requestId: store.requestId,
						correlationId: store.correlationId,
						traceId: store.traceId,
					}
				: {}),
		};
	},
	serializers: {
		err: pino.stdSerializers.err,
	},
});
