import type { IPushNotificationService } from '@application/ports/services/push-notification.port.ts';
import type { IQueueService } from '@domain/index.ts';
import { container } from './container.ts';
import { TYPES } from './types.ts';

export const pushNotificationService = container.get<IPushNotificationService>(
	TYPES.Services.PushNotificationService,
);

export const bullmqQueueService = container.get<IQueueService>(TYPES.Services.QueueService);
