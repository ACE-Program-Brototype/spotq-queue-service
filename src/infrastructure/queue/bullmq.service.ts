import type { IQueueService, JobOptions, QueueJob } from '@domain/index.ts';
import { config } from '@infrastructure/config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export class BullMQQueueService implements IQueueService {
	private readonly queues: Map<string, Queue> = new Map();
	private readonly connection: IORedis;

	constructor(connectionUrl: string = config.redis.url) {
		this.connection = new IORedis(connectionUrl, {
			maxRetriesPerRequest: null,
			enableReadyCheck: false,
		});

		this.connection.on('error', (err) => {
			logger.error({ err }, 'BullMQ Redis connection error');
		});
	}

	private getQueue(queueName: string): Queue {
		let queue = this.queues.get(queueName);
		if (!queue) {
			queue = new Queue(queueName, { connection: this.connection });
			this.queues.set(queueName, queue);
		}
		return queue;
	}

	async addJob<T = unknown>(
		queueName: string,
		jobName: string,
		data: T,
		options?: JobOptions,
	): Promise<QueueJob<T>> {
		const queue = this.getQueue(queueName);
		const job = await queue.add(jobName, data, options);

		return {
			id: job.id ?? '',
			name: job.name,
			data: job.data as T,
			timestamp: job.timestamp,
		};
	}

	async isHealthy(): Promise<boolean> {
		try {
			const status = await this.connection.ping();
			return status === 'PONG';
		} catch {
			return false;
		}
	}

	async close(): Promise<void> {
		for (const queue of this.queues.values()) {
			await queue.close();
		}
		this.queues.clear();
		await this.connection.quit();
	}
}

export const bullmqQueueService = new BullMQQueueService();
