import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { IEtaService } from '@application/ports/services/eta-service.port.ts';
import type { IPushNotificationService } from '@application/ports/services/push-notification.port.ts';
import type { IRestaurantServiceClient } from '@application/ports/services/restaurant-service.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import type { IAssignTableUseCase } from '@application/ports/use-cases/assign-table.use-case.port.ts';
import type { IGetActiveQueueByUserUseCase } from '@application/ports/use-cases/get-active-queue-by-user.use-case.port.ts';
import type { IGetQueueEtaUseCase } from '@application/ports/use-cases/get-queue-eta.use-case.port.ts';
import type { IGetStaffQueueUseCase } from '@application/ports/use-cases/get-staff-queue.use-case.port.ts';
import type { IRegisterQueueUseCase } from '@application/ports/use-cases/register-queue.use-case.port.ts';
import type { IRingCustomerUseCase } from '@application/ports/use-cases/ring-customer.use-case.port.ts';
import { AssignTableUseCase } from '@application/use-cases/assign-table.use-case.ts';
import { GetActiveQueueByUserUseCase } from '@application/use-cases/get-active-queue-by-user.use-case.ts';
import { GetQueueEtaUseCase } from '@application/use-cases/get-queue-eta.use-case.ts';
import { GetStaffQueueUseCase } from '@application/use-cases/get-staff-queue.use-case.ts';
import { RegisterQueueUseCase } from '@application/use-cases/register-queue.use-case.ts';
import { RingCustomerUseCase } from '@application/use-cases/ring-customer.use-case.ts';
import type { IHealthService, IQueueService } from '@domain/index.ts';
import type { IQueueRepository } from '@domain/repositories/queue.repository.interface.ts';
import { DatabaseService } from '@infrastructure/database/database.service.ts';
import { prisma } from '@infrastructure/database/prisma.ts';
import { PrismaQueueRepository } from '@infrastructure/database/repositories/prisma-queue.repository.ts';
import { MlEtaServiceClient } from '@infrastructure/external/ml-eta-service.client.ts';
import { RestaurantServiceClient } from '@infrastructure/external/restaurant-service.client.ts';
import { FirebasePushNotificationService } from '@infrastructure/firebase/index.ts';
import { BullMQQueueService } from '@infrastructure/queue/bullmq.service.ts';
import { redisClient } from '@infrastructure/redis/redis.client.ts';
import { RedisService } from '@infrastructure/redis/redis.service.ts';
import { RedisQueueCacheService } from '@infrastructure/redis/redis-queue-cache.service.ts';
import { HealthService } from '@infrastructure/services/health.service.ts';
import { SocketBroadcaster } from '@infrastructure/websocket/socket-broadcaster.ts';
import { CustomerQueueController } from '@presentation/http/controllers/customer-queue.controller.ts';
import { HealthController } from '@presentation/http/controllers/health.controller.ts';
import { InternalQueueController } from '@presentation/http/controllers/internal-queue.controller.ts';
import { StaffQueueController } from '@presentation/http/controllers/staff-queue.controller.ts';
import type { PrismaClient } from '@prisma/client';
import { ContainerModule } from 'inversify';
import type Redis from 'ioredis';
import { TYPES } from './types.ts';

export const queueModule = new ContainerModule(({ bind }) => {
	bind<PrismaClient>(TYPES.Database.PrismaClient).toConstantValue(prisma);
	bind<Redis>(TYPES.Redis.Client).toConstantValue(redisClient);

	bind<DatabaseService>(TYPES.Infrastructure.DatabaseService)
		.to(DatabaseService)
		.inSingletonScope();

	bind<RedisService>(TYPES.Infrastructure.RedisService).to(RedisService).inSingletonScope();

	bind<BullMQQueueService>(TYPES.Services.BullMQQueueService)
		.to(BullMQQueueService)
		.inSingletonScope();
	bind<IQueueService>(TYPES.Services.QueueService).toService(TYPES.Services.BullMQQueueService);

	bind<IQueueRepository>(TYPES.Repositories.QueueRepository)
		.to(PrismaQueueRepository)
		.inSingletonScope();

	bind<IRestaurantServiceClient>(TYPES.Services.RestaurantServiceClient)
		.to(RestaurantServiceClient)
		.inSingletonScope();

	bind<IEtaService>(TYPES.Services.EtaService).to(MlEtaServiceClient).inSingletonScope();

	bind<IQueueCacheService>(TYPES.Services.QueueCacheService)
		.to(RedisQueueCacheService)
		.inSingletonScope();

	bind<IWebSocketBroadcaster>(TYPES.Services.WebSocketBroadcaster)
		.to(SocketBroadcaster)
		.inSingletonScope();

	bind<IPushNotificationService>(TYPES.Services.PushNotificationService)
		.to(FirebasePushNotificationService)
		.inSingletonScope();

	bind<IHealthService>(TYPES.Services.HealthService).to(HealthService).inSingletonScope();

	bind<IRegisterQueueUseCase>(TYPES.UseCases.RegisterQueueUseCase)
		.to(RegisterQueueUseCase)
		.inSingletonScope();

	bind<IAssignTableUseCase>(TYPES.UseCases.AssignTableUseCase)
		.to(AssignTableUseCase)
		.inSingletonScope();

	bind<IRingCustomerUseCase>(TYPES.UseCases.RingCustomerUseCase)
		.to(RingCustomerUseCase)
		.inSingletonScope();

	bind<IGetActiveQueueByUserUseCase>(TYPES.UseCases.GetActiveQueueByUserUseCase)
		.to(GetActiveQueueByUserUseCase)
		.inSingletonScope();

	bind<IGetQueueEtaUseCase>(TYPES.UseCases.GetQueueEtaUseCase)
		.to(GetQueueEtaUseCase)
		.inSingletonScope();

	bind<IGetStaffQueueUseCase>(TYPES.UseCases.GetStaffQueueUseCase)
		.to(GetStaffQueueUseCase)
		.inSingletonScope();

	bind<HealthController>(TYPES.Controllers.HealthController)
		.to(HealthController)
		.inSingletonScope();

	bind<StaffQueueController>(TYPES.Controllers.StaffQueueController)
		.to(StaffQueueController)
		.inSingletonScope();

	bind<InternalQueueController>(TYPES.Controllers.InternalQueueController)
		.to(InternalQueueController)
		.inSingletonScope();

	bind<CustomerQueueController>(TYPES.Controllers.CustomerQueueController)
		.to(CustomerQueueController)
		.inSingletonScope();
});
