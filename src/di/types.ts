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
	},
	UseCases: {
		RegisterQueueUseCase: Symbol.for('RegisterQueueUseCase'),
		GetActiveQueueByUserUseCase: Symbol.for('GetActiveQueueByUserUseCase'),
	},
	Controller: {
		StaffQueueController: Symbol.for('StaffQueueController'),
		InternalQueueController: Symbol.for('InternalQueueController'),
	},

	// Top-level aliases for direct access convenience
	PrismaClient: Symbol.for('PrismaClient'),
	RedisClient: Symbol.for('RedisClient'),
	QueueRepository: Symbol.for('QueueRepository'),
	RestaurantServiceClient: Symbol.for('RestaurantServiceClient'),
	EtaService: Symbol.for('EtaService'),
	QueueCacheService: Symbol.for('QueueCacheService'),
	WebSocketBroadcaster: Symbol.for('WebSocketBroadcaster'),
	RegisterQueueUseCase: Symbol.for('RegisterQueueUseCase'),
	GetActiveQueueByUserUseCase: Symbol.for('GetActiveQueueByUserUseCase'),
	StaffQueueController: Symbol.for('StaffQueueController'),
	InternalQueueController: Symbol.for('InternalQueueController'),
} as const;

export type ServiceTypes = typeof TYPES;
