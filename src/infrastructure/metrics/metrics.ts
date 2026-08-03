import client from 'prom-client';
import { prisma } from '../database/index.js';
import { redisClient } from '../redis/index.js';

// Enable default metrics collection (includes CPU, Memory, Event Loop Lag, etc.)
client.collectDefaultMetrics();

// HTTP request count metric
export const httpRequestCounter = new client.Counter({
	name: 'http_requests_total',
	help: 'Total number of HTTP requests processed',
	labelNames: ['method', 'route', 'status_code'],
});

// HTTP request duration metric
export const httpRequestDuration = new client.Histogram({
	name: 'http_request_duration_seconds',
	help: 'Latency of HTTP requests in seconds',
	labelNames: ['method', 'route', 'status_code'],
	buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Postgres status metric (updated dynamically on scrape)
export const databaseUpGauge = new client.Gauge({
	name: 'database_up',
	help: 'Postgres database connection status (1 = UP, 0 = DOWN)',
	async collect() {
		try {
			await prisma.$queryRaw`SELECT 1`;
			this.set(1);
		} catch {
			this.set(0);
		}
	},
});

// Redis status metric (updated dynamically on scrape)
export const redisUpGauge = new client.Gauge({
	name: 'redis_up',
	help: 'Redis connection status (1 = UP, 0 = DOWN)',
	async collect() {
		try {
			const response = await redisClient.ping();
			this.set(response === 'PONG' ? 1 : 0);
		} catch {
			this.set(0);
		}
	},
});
