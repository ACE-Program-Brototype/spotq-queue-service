/**
 * Inversify Dependency Injection service identifier symbols.
 *
 * Categorized logically into:
 * - Database: Data persistence clients (Prisma)
 * - Redis: Cache and in-memory key-value stores
 * - Repositories: Domain repository abstractions
 * - Services: External HTTP clients and internal utility adapters
 * - UseCases: Application business logic orchestration
 * - Controller: HTTP presentation controllers
 */
export const TYPES = {
	Database: {
		PrismaClient: Symbol.for('PrismaClient'),
	},
	Redis: {
		Client: Symbol.for('RedisClient'),
	},
	Repositories: {
		QueueRepository: Symbol.for('QueueRepository'),
	},
	Services: {
		RestaurantServiceClient: Symbol.for('RestaurantServiceClient'),
		EtaService: Symbol.for('EtaService'),
		QueueCacheService: Symbol.for('QueueCacheService'),
		WebSocketBroadcaster: Symbol.for('WebSocketBroadcaster'),
		PushNotificationService: Symbol.for('PushNotificationService'),
	},
	UseCases: {
		RegisterQueueUseCase: Symbol.for('RegisterQueueUseCase'),
	},
	Controller: {
		StaffQueueController: Symbol.for('StaffQueueController'),
	},

	// Top-level aliases for direct access convenience
	PrismaClient: Symbol.for('PrismaClient'),
	RedisClient: Symbol.for('RedisClient'),
	QueueRepository: Symbol.for('QueueRepository'),
	RestaurantServiceClient: Symbol.for('RestaurantServiceClient'),
	EtaService: Symbol.for('EtaService'),
	QueueCacheService: Symbol.for('QueueCacheService'),
	WebSocketBroadcaster: Symbol.for('WebSocketBroadcaster'),
	PushNotificationService: Symbol.for('PushNotificationService'),
	RegisterQueueUseCase: Symbol.for('RegisterQueueUseCase'),
	StaffQueueController: Symbol.for('StaffQueueController'),
} as const;

export type ServiceTypes = typeof TYPES;
