import { config } from '@infrastructure/config/index.ts';
import { databaseService } from '@infrastructure/database/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { redisService } from '@infrastructure/redis/index.ts';
import { MESSAGES } from '@shared/constants/index.ts';
import app from './app.ts';

async function bootstrap() {
	await databaseService.connect();
	await redisService.connect();

	const server = app.listen(config.port, () => {
		logger.info(
			{
				port: config.port,
				nodeEnv: config.nodeEnv,
				serviceName: config.serviceName,
			},
			`Queue Service running on port ${config.port}`,
		);
	});

	let isShuttingDown = false;

	const handleShutdown = async (signal: string) => {
		if (isShuttingDown) {
			logger.warn(MESSAGES.SHUTDOWN_IN_PROGRESS);
			return;
		}

		isShuttingDown = true;
		logger.info(signal === 'SIGINT' ? MESSAGES.SHUTDOWN_SIGINT : MESSAGES.SHUTDOWN_SIGTERM);

		const forceExitTimeout = setTimeout(() => {
			logger.error(MESSAGES.SHUTDOWN_TIMEOUT);
			process.exit(1);
		}, 10000);

		try {
			await new Promise<void>((resolve, reject) => {
				server.close((err) => {
					if (err) {
						reject(err);
					} else {
						logger.info(MESSAGES.HTTP_SERVER_CLOSED);
						resolve();
					}
				});
			});

			await redisService.disconnect();
			await databaseService.disconnect();

			clearTimeout(forceExitTimeout);
			logger.info(MESSAGES.SHUTDOWN_COMPLETED);
			process.exit(0);
		} catch (error) {
			clearTimeout(forceExitTimeout);
			logger.error({ err: error }, MESSAGES.SHUTDOWN_ERROR);
			process.exit(1);
		}
	};

	process.on('SIGTERM', () => handleShutdown('SIGTERM'));
	process.on('SIGINT', () => handleShutdown('SIGINT'));
}

bootstrap().catch((error) => {
	logger.fatal({ err: error }, MESSAGES.SERVER_BOOTSTRAP_FAILED);
	process.exit(1);
});
