export const TYPES = {
	Database: {
		PrismaClient: Symbol.for('PrismaClient'),
	},
	Redis: {
		Client: Symbol.for('RedisClient'),
	},
	Infrastructure: {
		DatabaseService: Symbol.for('DatabaseService'),
		RedisService: Symbol.for('RedisService'),
		BullMQQueueService: Symbol.for('BullMQQueueService'),
	},
	Repositories: {
		QueueRepository: Symbol.for('QueueRepository'),
	},
	Services: {
		DatabaseService: Symbol.for('DatabaseService'),
		RedisService: Symbol.for('RedisService'),
		BullMQQueueService: Symbol.for('BullMQQueueService'),
		RestaurantServiceClient: Symbol.for('RestaurantServiceClient'),
		EtaService: Symbol.for('EtaService'),
		QueueCacheService: Symbol.for('QueueCacheService'),
		WebSocketBroadcaster: Symbol.for('WebSocketBroadcaster'),
		PushNotificationService: Symbol.for('PushNotificationService'),
		QueueService: Symbol.for('QueueService'),
		HealthService: Symbol.for('HealthService'),
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
		HealthController: Symbol.for('HealthController'),
		StaffQueueController: Symbol.for('StaffQueueController'),
		InternalQueueController: Symbol.for('InternalQueueController'),
		CustomerQueueController: Symbol.for('CustomerQueueController'),
	},

	// Top-level aliases for direct access convenience
	DatabaseService: Symbol.for('DatabaseService'),
	RedisService: Symbol.for('RedisService'),
	BullMQQueueService: Symbol.for('BullMQQueueService'),
	HealthService: Symbol.for('HealthService'),
	HealthController: Symbol.for('HealthController'),
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
