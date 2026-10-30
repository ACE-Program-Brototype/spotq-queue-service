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
		QueueService: Symbol.for('QueueService'),
	},
	UseCases: {
		RegisterQueueUseCase: Symbol.for('RegisterQueueUseCase'),
		GetActiveQueueByUserUseCase: Symbol.for('GetActiveQueueByUserUseCase'),
		GetQueueEtaUseCase: Symbol.for('GetQueueEtaUseCase'),
		AssignTableUseCase: Symbol.for('AssignTableUseCase'),
		RingCustomerUseCase: Symbol.for('RingCustomerUseCase'),
		Internal: {
			GetCustomerQueueStatusUseCase: Symbol.for('GetCustomerQueueStatusUseCase'),
		},
		GetStaffQueueUseCase: Symbol.for('GetStaffQueueUseCase'),
	},
	Controllers: {
		StaffQueueController: Symbol.for('StaffQueueController'),
		InternalQueueController: Symbol.for('InternalQueueController'),
		CustomerQueueController: Symbol.for('CustomerQueueController'),
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
	GetActiveQueueByUserUseCase: Symbol.for('GetActiveQueueByUserUseCase'),
	GetQueueEtaUseCase: Symbol.for('GetQueueEtaUseCase'),
	GetStaffQueueUseCase: Symbol.for('GetStaffQueueUseCase'),
	StaffQueueController: Symbol.for('StaffQueueController'),
	InternalQueueController: Symbol.for('InternalQueueController'),
	CustomerQueueController: Symbol.for('CustomerQueueController'),
} as const;

export type ServiceTypes = typeof TYPES;
