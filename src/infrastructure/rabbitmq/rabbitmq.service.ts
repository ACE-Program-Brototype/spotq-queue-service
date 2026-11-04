import type {
	IRabbitMQService,
	MlEtaTrainingEvent,
} from '@application/ports/services/rabbitmq-service.port.ts';
import { TYPES } from '@di/types.ts';
import { config } from '@infrastructure/config/index.ts';
import type { RabbitMQClient } from '@spotq-org/rabbitmq-client';
import { inject, injectable } from 'inversify';
import { rabbitmqClient } from './rabbitmq.client.ts';
import { RABBITMQ_QUEUES } from './rabbitmq.constants.ts';

@injectable()
export class RabbitMQService implements IRabbitMQService {
	constructor(
		@inject(TYPES.RabbitMQ.Client)
		private readonly client: RabbitMQClient = rabbitmqClient,
	) {}

	async publishToMlEta(event: MlEtaTrainingEvent): Promise<boolean> {
		const queueName = config.rabbitmq.mlEtaQueue || RABBITMQ_QUEUES.ML_ETA_TRAINING;
		return this.client.publishToQueue(queueName, event);
	}
}
