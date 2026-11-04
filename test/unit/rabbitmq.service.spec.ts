import type { MlEtaTrainingEvent } from '@application/ports/services/rabbitmq-service.port';
import { config } from '@infrastructure/config/index.ts';
import { RABBITMQ_QUEUES, RabbitMQService } from '@infrastructure/rabbitmq/index.ts';
import type { RabbitMQClient } from '@spotq-org/rabbitmq-client';

describe('RabbitMQService Unit Tests', () => {
	let mockClient: jest.Mocked<Partial<RabbitMQClient>>;
	let service: RabbitMQService;

	const mockEvent: MlEtaTrainingEvent = {
		queue_entry_id: 'entry-123',
		restaurant_id: 'rest-456',
		party_size: 4,
		joined_at: '2026-10-09T10:30:00.000Z',
		seated_at: '2026-10-09T10:55:00.000Z',
		total_people_ahead_at_join: 3,
	};

	beforeEach(() => {
		mockClient = {
			publishToQueue: jest.fn().mockResolvedValue(true),
		};
		service = new RabbitMQService(mockClient as unknown as RabbitMQClient);
	});

	describe('publishToMlEta', () => {
		it('should publish training event to the configured ml-eta queue', async () => {
			const result = await service.publishToMlEta(mockEvent);

			const expectedQueue = config.rabbitmq.mlEtaQueue || RABBITMQ_QUEUES.ML_ETA_TRAINING;
			expect(mockClient.publishToQueue).toHaveBeenCalledTimes(1);
			expect(mockClient.publishToQueue).toHaveBeenCalledWith(expectedQueue, mockEvent);
			expect(result).toBe(true);
		});

		it('should propagate errors when publishing to queue fails', async () => {
			mockClient.publishToQueue = jest
				.fn()
				.mockRejectedValue(new Error('Broker connection terminated'));

			await expect(service.publishToMlEta(mockEvent)).rejects.toThrow(
				'Broker connection terminated',
			);
		});
	});
});
