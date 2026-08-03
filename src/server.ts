import app from './app.js';
import { config } from './config/index.js';

const server = app.listen(config.server.port, () => {
	console.log(`${config.service.name} running on port ${config.server.port}`);
});

const shutdown = () => {
	console.log('Gracefully shutting down...');

	server.close(() => {
		process.exit(0);
	});
};

process.on('SIGINT', shutdown);

process.on('SIGTERM', shutdown);
