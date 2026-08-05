import app from './app.js';
import { config } from './config/index.js';
import { PrismaService } from './infrastructure/database/index.js';
import { logger } from './infrastructure/logger/index.js';
import { RedisService } from './infrastructure/redis/index.js';

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
			logger.error('Graceful shutdown timed out. Forcing shutdown...');
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
				logger.info('HTTP server closed successfully');
			}

			// Disconnect from database and cache *after* HTTP server finishes processing current requests
			try {
				logger.info('Disconnecting database client...');
				await PrismaService.disconnect();
				logger.info('Database client disconnected');
			} catch (dbErr) {
				logger.error(dbErr, 'Error disconnecting database client');
			}

			try {
				logger.info('Disconnecting Redis client...');
				await RedisService.disconnect();
				logger.info('Redis client disconnected');
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
	logger.error(error, 'Failed to bootstrap server');
	process.exit(1);
});
