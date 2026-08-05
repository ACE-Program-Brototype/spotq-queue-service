import pino from 'pino';
import { config } from '../../config/env.js';
import { loggerLocalStorage } from './logger-context.js';

export const logger = pino({
	level: config.service.logLevel || 'info',
	timestamp: false,
	formatters: {
		level: (label) => {
			return { level: label.toUpperCase() };
		},
	},
	mixin() {
		const store = loggerLocalStorage.getStore();
		return {
			serviceName: config.service.name,
			timestamp: new Date().toISOString(),
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
