import client from 'prom-client';
import { prisma } from '../database/index.ts';
import { redisClient } from '../redis/index.ts';

client.collectDefaultMetrics({ prefix: 'spotq_queue_' });

export const httpRequestDuration = new client.Histogram({
	name: 'spotq_queue_http_request_duration_seconds',
	help: 'Duration of HTTP requests in seconds',
	labelNames: ['method', 'route', 'status_code'],
	buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 1.5, 2, 5],
});

export const httpRequestCounter = new client.Counter({
	name: 'spotq_queue_http_requests_total',
	help: 'Total number of HTTP requests',
	labelNames: ['method', 'route', 'status_code'],
});

export const dbConnectionGauge = new client.Gauge({
	name: 'spotq_queue_db_connection_status',
	help: 'Database connection status (1 for connected, 0 for disconnected)',
	async collect() {
		try {
			await prisma.$queryRaw`SELECT 1`;
			this.set(1);
		} catch {
			this.set(0);
		}
	},
});

export const redisConnectionGauge = new client.Gauge({
	name: 'spotq_queue_redis_connection_status',
	help: 'Redis connection status (1 for connected, 0 for disconnected)',
	async collect() {
		try {
			const res = await redisClient.ping();
			this.set(res === 'PONG' ? 1 : 0);
		} catch {
			this.set(0);
		}
	},
});

export { client as prometheusClient };
