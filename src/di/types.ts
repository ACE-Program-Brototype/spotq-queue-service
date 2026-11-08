export const TYPES = {
	Database: {
		PrismaClient: Symbol.for('PrismaClient'),
	},
	Redis: {
		Client: Symbol.for('RedisClient'),
	},
	RabbitMQ: {
		Client: Symbol.for('RabbitMQClient'),
	},
	Logger: {
		PinoClient: Symbol.for('Logger'),
	},
	Infrastructure: {
		DatabaseService: Symbol.for('DatabaseService'),
		RedisService: Symbol.for('RedisService'),
	},
	Repositories: {
		QueueRepository: Symbol.for('QueueRepository'),
	},
	Services: {
		BullMQQueueService: Symbol.for('BullMQQueueService'),
		RestaurantServiceClient: Symbol.for('RestaurantServiceClient'),
		EtaService: Symbol.for('EtaService'),
		QueueCacheService: Symbol.for('QueueCacheService'),
		WebSocketBroadcaster: Symbol.for('WebSocketBroadcaster'),
		PushNotificationService: Symbol.for('PushNotificationService'),
		QueueService: Symbol.for('QueueService'),
		HealthService: Symbol.for('HealthService'),
		QueuePositionRecalculator: Symbol.for('QueuePositionRecalculator'),
		RabbitMQService: Symbol.for('RabbitMQService'),
	},
	UseCases: {
		RegisterQueueUseCase: Symbol.for('RegisterQueueUseCase'),
		GetActiveQueueByUserUseCase: Symbol.for('GetActiveQueueByUserUseCase'),
		GetQueueEtaUseCase: Symbol.for('GetQueueEtaUseCase'),
		AssignTableUseCase: Symbol.for('AssignTableUseCase'),
		RingCustomerUseCase: Symbol.for('RingCustomerUseCase'),
		SeatPartyUseCase: Symbol.for('SeatPartyUseCase'),
		SkipPartyUseCase: Symbol.for('SkipPartyUseCase'),
		CancelQueueEntryUseCase: Symbol.for('CancelQueueEntryUseCase'),
		GetCustomerQueueStatusSnapshotUseCase: Symbol.for('GetCustomerQueueStatusSnapshotUseCase'),
		Internal: {
			GetCustomerQueueStatusUseCase: Symbol.for('GetCustomerQueueStatusUseCase'),
		},
		GetStaffQueueUseCase: Symbol.for('GetStaffQueueUseCase'),
	},
	Controllers: {
		HealthController: Symbol.for('HealthController'),
		StaffQueueController: Symbol.for('StaffQueueController'),
		StaffQueueActionsController: Symbol.for('StaffQueueActionsController'),
		InternalQueueController: Symbol.for('InternalQueueController'),
		CustomerQueueController: Symbol.for('CustomerQueueController'),
	},
} as const;

export type ServiceTypes = typeof TYPES;
