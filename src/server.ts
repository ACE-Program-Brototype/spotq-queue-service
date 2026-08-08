import app from './app.js';
import { config } from './infrastructure/config/index.js';
import { PrismaService } from './infrastructure/database/index.js';
import { logger } from './infrastructure/logger/index.js';
import { RedisService } from './infrastructure/redis/index.js';
import { MESSAGES } from './shared/constants/index.js';

async function bootstrap() {
	await PrismaService.connect();
	await RedisService.connect();

	const server = app.listen(config.server.port, () => {
		logger.info(`${config.service.name} running on port ${config.server.port}`);
	});

	let isShuttingDown = false;

	const shutdown = async (signal: string) => {
		if (isShuttingDown) {
			logger.warn(`Received ${signal} but shutdown is already in progress...`);
			return;
		}
		isShuttingDown = true;
		logger.info(`Received ${signal}. Gracefully shutting down...`);

		// Set a safety timeout of 10 seconds to force-exit if connections hang
		const forceExitTimeout = setTimeout(async () => {
			logger.error(MESSAGES.SHUTDOWN_TIMEOUT);
			try {
				await PrismaService.disconnect();
				await RedisService.disconnect();
			} catch (err) {
				logger.error(err, 'Error disconnecting external services on forced shutdown');
			}
			process.exit(1);
		}, 10000);

		// Stop accepting new connections
		server.close(async (err) => {
			if (err) {
				logger.error(err, 'Error during HTTP server close');
			} else {
				logger.info(MESSAGES.HTTP_SERVER_CLOSED);
			}

			// Disconnect from database and cache *after* HTTP server finishes processing current requests
			try {
				logger.info(MESSAGES.DATABASE_DISCONNECTING);
				await PrismaService.disconnect();
				logger.info(MESSAGES.DATABASE_DISCONNECTED);
			} catch (dbErr) {
				logger.error(dbErr, 'Error disconnecting database client');
			}

			try {
				logger.info(MESSAGES.REDIS_DISCONNECTING);
				await RedisService.disconnect();
				logger.info(MESSAGES.REDIS_DISCONNECTED);
			} catch (redisErr) {
				logger.error(redisErr, 'Error disconnecting Redis client');
			}

			clearTimeout(forceExitTimeout);
			logger.info('Graceful shutdown completed');
			process.exit(0);
		});

		// Drop idle Keep-Alive connections so the server can shut down immediately without hanging on inactive clients
		server.closeIdleConnections();
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
	logger.error(error, MESSAGES.SERVER_BOOTSTRAP_FAILED);
	process.exit(1);
});
