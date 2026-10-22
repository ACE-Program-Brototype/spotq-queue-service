import type { JobOptions } from '@domain/index.ts';

export const QUEUE_NAMES = {
	PUSH_NOTIFICATIONS: 'push-notifications',
} as const;

export const JOB_NAMES = {
	SEND_PUSH_NOTIFICATION: 'send-push-notification',
} as const;

export const QUEUE_EVENTS = {
	ERROR: 'error',
	FAILED: 'failed',
	COMPLETED: 'completed',
} as const;

export const PUSH_NOTIFICATION_JOB_OPTIONS: JobOptions = {
	attempts: 3,
	backoff: { type: 'exponential', delay: 1000 },
	removeOnComplete: true,
};
