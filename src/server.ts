import app from './app.js';
import { config } from './config/index.js';
import { databaseService } from './infrastructure/database/index.js';

await databaseService.connect();

console.log('PostgreSQL connected');

const server = app.listen(config.server.port, () => {
	console.log(`${config.service.name} running on port ${config.server.port}`);
});

const shutdown = async () => {
	console.log('Gracefully shutting down...');

	await databaseService.disconnect();

	server.close(() => {
		process.exit(0);
	});
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
