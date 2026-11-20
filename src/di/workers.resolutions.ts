import type { PushNotificationPayload } from '@application/ports/services/push-notification.port.ts';
import { createNotificationWorker } from '@infrastructure/queue/index.ts';
import type { Worker } from 'bullmq';
import { pushNotificationService } from './services.resolutions.ts';

export function initNotificationWorker(): Worker<PushNotificationPayload> {
	return createNotificationWorker(pushNotificationService);
}

export interface AppWorkers {
	notificationWorker: Worker<PushNotificationPayload>;
	closeAll: () => Promise<void>;
}

export function initWorkers(): AppWorkers {
	const notificationWorker = initNotificationWorker();

	return {
		notificationWorker,
		closeAll: async () => {
			await notificationWorker.close();
		},
	};
}
