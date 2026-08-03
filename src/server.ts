import app from './app.js';
import { config } from './config/index.js';
import { PrismaService } from './infrastructure/database/index.js';
import { RedisService } from './infrastructure/redis/index.js';

async function bootstrap() {
	await PrismaService.connect();
	await RedisService.connect();

	const server = app.listen(config.server.port, () => {
		console.log(`${config.service.name} running on port ${config.server.port}`);
	});

	const shutdown = async () => {
		console.log('Gracefully shutting down...');

		await PrismaService.disconnect();
		await RedisService.disconnect();

		server.close(() => process.exit(0));
	};

	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
	console.error(error);
	process.exit(1);
});
