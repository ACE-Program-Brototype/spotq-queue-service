import 'reflect-metadata';
import { GetActiveQueueByUserUseCase } from '@application/use-cases/get-active-queue-by-user.use-case.ts';
import { QueueEntry, QueueStatus, RegistrationType } from '@domain/index.ts';
import type { IQueueRepository } from '@domain/repositories/queue.repository.interface.ts';

describe('GetActiveQueueByUserUseCase', () => {
	let mockQueueRepository: jest.Mocked<IQueueRepository>;
	let useCase: GetActiveQueueByUserUseCase;

	const restaurantId = '11111111-1111-1111-1111-111111111111';
	const userId = '22222222-2222-2222-2222-222222222222';

	beforeEach(() => {
		mockQueueRepository = {
			findActiveEntries: jest.fn(),
			countActiveAhead: jest.fn(),
			sumPartySizeActiveAhead: jest.fn(),
			countToday: jest.fn(),
			getRegistrationMetrics: jest.fn(),
			findActiveByPhone: jest.fn(),
			findActiveByUserId: jest.fn(),
			findActiveByRestaurantAndUserId: jest.fn(),
			createWithHistory: jest.fn(),
			findById: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
		} as unknown as jest.Mocked<IQueueRepository>;

		useCase = new GetActiveQueueByUserUseCase(mockQueueRepository);
	});

	it('should return hasActiveQueue: true and queueEntry details when an active queue exists', async () => {
		const activeQueue = QueueEntry.create({
			id: '33333333-3333-3333-3333-333333333333',
			restaurantId,
			userId,
			guestName: 'John Doe',
			phone: '+1234567890',
			queueNumber: 'W-001',
			partySize: 2,
			position: 1,
			estimatedWaitMinutes: 15,
			registrationType: RegistrationType.ONLINE,
		});

		mockQueueRepository.findActiveByRestaurantAndUserId.mockResolvedValue(activeQueue);

		const result = await useCase.execute({ restaurantId, userId });

		expect(result.hasActiveQueue).toBe(true);
		expect(result.queueEntry).not.toBeNull();
		expect(result.queueEntry?.queueEntryId).toBe(activeQueue.id);
		expect(result.queueEntry?.queueNumber).toBe('W-001');
		expect(result.queueEntry?.userId).toBe(userId);
		expect(result.queueEntry?.status).toBe(QueueStatus.WAITING);
		expect(mockQueueRepository.findActiveByRestaurantAndUserId).toHaveBeenCalledWith(
			restaurantId,
			userId,
		);
	});

	it('should return hasActiveQueue: false and null queueEntry when no active queue exists', async () => {
		mockQueueRepository.findActiveByRestaurantAndUserId.mockResolvedValue(null);

		const result = await useCase.execute({ restaurantId, userId });

		expect(result.hasActiveQueue).toBe(false);
		expect(result.queueEntry).toBeNull();
		expect(mockQueueRepository.findActiveByRestaurantAndUserId).toHaveBeenCalledWith(
			restaurantId,
			userId,
		);
	});
});
