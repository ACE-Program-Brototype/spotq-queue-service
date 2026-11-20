import type { IPushNotificationService } from '@application/ports/services/push-notification.port.ts';
import type { IQueueService } from '@domain/index.ts';
import type { DatabaseService } from '@infrastructure/database/database.service.ts';
import type { RedisService } from '@infrastructure/redis/redis.service.ts';
import { container } from './container.ts';
import { TYPES } from './types.ts';

export const pushNotificationService = container.get<IPushNotificationService>(
	TYPES.Services.PushNotificationService,
);

export const bullmqQueueService = container.get<IQueueService>(TYPES.Services.QueueService);

export const databaseService = container.get<DatabaseService>(TYPES.Infrastructure.DatabaseService);

export const redisService = container.get<RedisService>(TYPES.Infrastructure.RedisService);
