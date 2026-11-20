import { randomUUID } from 'node:crypto';
import type {
	IPushNotificationService,
	PushNotificationPayload,
} from '@application/ports/services/push-notification.port.ts';
import { config } from '@infrastructure/config/index.ts';
import { logger, loggerLocalStorage } from '@infrastructure/logger/index.ts';
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
			const correlationId =
				job.data?.correlationId || job.data?.data?.correlationId || randomUUID();
			const startTime = process.hrtime.bigint();

			return await loggerLocalStorage.run({ correlationId, requestId: correlationId }, async () => {
				logger.debug(
					{
						job: {
							queue: QUEUE_NAMES.PUSH_NOTIFICATIONS,
							routing_key: job.name,
							job_id: job.id,
							status: 'PROCESSING',
						},
						context: {
							fid_suffix: job.data.fid?.slice(-6),
						},
					},
					`Processing queue message '${job.name}'`,
				);

				const result = await pushNotificationService.send(job.data);

				if (!result.success && !result.isTokenInvalid) {
					logger.warn(
						{
							job: {
								queue: QUEUE_NAMES.PUSH_NOTIFICATIONS,
								routing_key: job.name,
								job_id: job.id,
								status: 'FAILED',
							},
							error: {
								name: 'PushNotificationDispatchError',
								message: result.error || 'Push notification dispatch failed',
							},
						},
						'Push notification dispatch failed in worker, retrying via BullMQ',
					);
					throw new Error(result.error || 'Push notification dispatch failed');
				}

				const endTime = process.hrtime.bigint();
				const durationMs = Math.round((Number(endTime - startTime) / 1_000_000) * 10) / 10;

				logger.info(
					{
						job: {
							queue: QUEUE_NAMES.PUSH_NOTIFICATIONS,
							routing_key: job.name,
							job_id: job.id,
							duration_ms: durationMs,
							status: 'SUCCESS',
						},
						context: {
							message_id: result.messageId,
						},
					},
					`Processed queue message '${job.name}'`,
				);
				return result;
			});
		},
		{
			connection,
			concurrency: 5,
		},
	);

	worker.on(QUEUE_EVENTS.FAILED, (job, err) => {
		const correlationId =
			job?.data?.correlationId || job?.data?.data?.correlationId || randomUUID();
		loggerLocalStorage.run({ correlationId, requestId: correlationId }, () => {
			logger.error(
				{
					err,
					job: {
						queue: QUEUE_NAMES.PUSH_NOTIFICATIONS,
						routing_key: job?.name || 'push-notification',
						job_id: job?.id,
						status: 'FAILED',
					},
				},
				`Queue message '${job?.name}' failed`,
			);
		});
	});

	worker.on(QUEUE_EVENTS.ERROR, (err) => {
		logger.error({ err }, 'Notification worker runtime error');
	});

	return worker;
}
