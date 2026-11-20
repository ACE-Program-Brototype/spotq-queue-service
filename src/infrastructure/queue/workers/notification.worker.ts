import type {
	IPushNotificationService,
	PushNotificationPayload,
} from '@application/ports/services/push-notification.port.ts';
import { config } from '@infrastructure/config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_EVENTS, QUEUE_NAMES } from '../queue.constants.ts';

export function createNotificationWorker(
	pushNotificationService: IPushNotificationService,
	connectionUrl: string = config.redis.url,
): Worker<PushNotificationPayload> {
	const connection = new IORedis(connectionUrl, {
		maxRetriesPerRequest: null,
		enableReadyCheck: false,
	});

	connection.on(QUEUE_EVENTS.ERROR, (err) => {
		logger.error({ err }, 'Notification worker Redis connection error');
	});

	const worker = new Worker<PushNotificationPayload>(
		QUEUE_NAMES.PUSH_NOTIFICATIONS,
		async (job: Job<PushNotificationPayload>) => {
			logger.info(
				{ jobId: job.id, fidSuffix: job.data.fid?.slice(-6) },
				'Notification worker processing job',
			);

			const result = await pushNotificationService.send(job.data);

			if (!result.success && !result.isTokenInvalid) {
				logger.warn(
					{ jobId: job.id, error: result.error },
					'Push notification dispatch failed in worker, retrying via BullMQ',
				);
				throw new Error(result.error || 'Push notification dispatch failed');
			}

			logger.info(
				{ jobId: job.id, messageId: result.messageId },
				'Push notification job completed successfully',
			);
			return result;
		},
		{
			connection,
			concurrency: 5,
		},
	);

	worker.on(QUEUE_EVENTS.FAILED, (job, err) => {
		logger.error({ jobId: job?.id, err }, 'Notification worker job failed permanently');
	});

	worker.on(QUEUE_EVENTS.ERROR, (err) => {
		logger.error({ err }, 'Notification worker runtime error');
	});

	return worker;
}
