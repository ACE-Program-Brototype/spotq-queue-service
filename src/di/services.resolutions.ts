import type { IPushNotificationService } from '@application/ports/services/push-notification.port.ts';
import { container } from './container.ts';
import { TYPES } from './types.ts';

export const pushNotificationService = container.get<IPushNotificationService>(
	TYPES.Services.PushNotificationService,
);
