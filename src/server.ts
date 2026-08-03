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

	const shutdown = async () => {
		logger.info('Gracefully shutting down...');

		await PrismaService.disconnect();
		await RedisService.disconnect();

		server.close(() => {
			logger.info('Graceful shutdown completed');
			process.exit(0);
		});
	};

	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
	logger.error(error, 'Failed to bootstrap server');
	process.exit(1);
});
