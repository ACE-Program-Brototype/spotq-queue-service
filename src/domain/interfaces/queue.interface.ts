export interface QueueJob<T = unknown> {
	id: string;
	name: string;
	data: T;
	timestamp?: number;
}

export interface JobOptions {
	priority?: number;
	delay?: number;
	attempts?: number;
	backoff?: {
		type: 'fixed' | 'exponential';
		delay: number;
	};
	removeOnComplete?: boolean | number;
	removeOnFail?: boolean | number;
}

export interface IQueueService {
	addJob<T = unknown>(
		queueName: string,
		jobName: string,
		data: T,
		options?: JobOptions,
	): Promise<QueueJob<T>>;
	isHealthy(): Promise<boolean> | boolean;
	close(): Promise<void>;
}
