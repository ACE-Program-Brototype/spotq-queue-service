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
		GetQueueEtaUseCase: Symbol.for('GetQueueEtaUseCase'),
		AssignTableUseCase: Symbol.for('AssignTableUseCase'),
	},
	Controllers: {
		StaffQueueController: Symbol.for('StaffQueueController'),
		CustomerQueueController: Symbol.for('CustomerQueueController'),
	},
} as const;

export type ServiceTypes = typeof TYPES;
