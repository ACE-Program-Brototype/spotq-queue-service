import { config } from '@infrastructure/config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { type ILogger, RabbitMQClient } from '@spotq-org/rabbitmq-client';

const rabbitmqLogger: ILogger = {
	info: (msg: string, ...args: unknown[]) => {
		if (args.length > 0) {
			logger.info({ extra: args }, msg);
		} else {
			logger.info(msg);
		}
	},
	warn: (msg: string, ...args: unknown[]) => {
		if (args.length > 0) {
			logger.warn({ extra: args }, msg);
		} else {
			logger.warn(msg);
		}
	},
	error: (msg: string, ...args: unknown[]) => {
		if (args.length > 0) {
			logger.error({ extra: args }, msg);
		} else {
			logger.error(msg);
		}
	},
	debug: (msg: string, ...args: unknown[]) => {
		if (args.length > 0) {
			logger.debug({ extra: args }, msg);
		} else {
			logger.debug(msg);
		}
	},
};

export const rabbitmqClient = new RabbitMQClient({
	url: config.rabbitmq.url,
	serviceName: config.serviceName,
	logger: rabbitmqLogger,
});
