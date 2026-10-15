import type { IQueueCacheService } from '@application/ports/cache/queue-cache.port.ts';
import type { IEtaService } from '@application/ports/services/eta-service.port.ts';
import type { IRestaurantServiceClient } from '@application/ports/services/restaurant-service.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import type { IRegisterWalkInUseCase } from '@application/ports/use-cases/register-walk-in.use-case.port.ts';
import { RegisterWalkInUseCase } from '@application/use-cases/register-walk-in.use-case.ts';
import type { IQueueRepository } from '@domain/repositories/queue.repository.interface.ts';
import { prisma } from '@infrastructure/database/prisma.ts';
import { PrismaQueueRepository } from '@infrastructure/database/repositories/prisma-queue.repository.ts';
import { MlEtaServiceClient } from '@infrastructure/external/ml-eta-service.client.ts';
import { RestaurantServiceClient } from '@infrastructure/external/restaurant-service.client.ts';
import { redisClient } from '@infrastructure/redis/redis.client.ts';
import { RedisQueueCacheService } from '@infrastructure/redis/redis-queue-cache.service.ts';
import { SocketBroadcaster } from '@infrastructure/websocket/socket-broadcaster.ts';
import { WalkInController } from '@presentation/http/controllers/walk-in.controller.ts';
import type { PrismaClient } from '@prisma/client';
import { ContainerModule } from 'inversify';
import type { RedisClientType } from 'redis';
import { TYPES } from './types.ts';

/**
 * Queue Inversify container module.
 *
 * Configures IoC bindings across all clean architecture layers:
 * - Infrastructure: Prisma Client, Redis Client, and HTTP/WebSocket clients
 * - Domain: Queue Repository
 * - Application: Walk-In Use Case and Port abstractions
 * - Presentation: Walk-In Controller
 */
export const queueModule = new ContainerModule(({ bind }) => {
	// Database & Cache infrastructure instances
	bind<PrismaClient>(TYPES.Database.PrismaClient).toConstantValue(prisma);
	bind<RedisClientType>(TYPES.Redis.Client).toConstantValue(redisClient);

	// Repositories
	bind<IQueueRepository>(TYPES.Repositories.QueueRepository)
		.to(PrismaQueueRepository)
		.inSingletonScope();

	// External Service Adapters & Cache
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

	// Use Cases
	bind<IRegisterWalkInUseCase>(TYPES.UseCases.RegisterWalkInUseCase)
		.to(RegisterWalkInUseCase)
		.inSingletonScope();

	// Controllers
	bind<WalkInController>(TYPES.Controller.WalkInController).to(WalkInController).inSingletonScope();
});
