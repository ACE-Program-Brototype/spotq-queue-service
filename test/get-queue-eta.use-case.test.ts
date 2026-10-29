import type { IEtaService } from '../src/application/ports/services/eta-service.port.ts';
import type { IRestaurantServiceClient } from '../src/application/ports/services/restaurant-service.port.ts';
import { GetQueueEtaUseCase } from '../src/application/use-cases/get-queue-eta.use-case.ts';
import {
	RestaurantBlockedError,
	RestaurantNotAcceptingQueueError,
	SubscriptionRequiredError,
} from '../src/domain/index.ts';
import type { IQueueRepository } from '../src/domain/repositories/queue.repository.interface.ts';
import { SUBSCRIPTION_PLAN } from '../src/shared/index.ts';

describe('GetQueueEtaUseCase Unit Tests', () => {
	let mockQueueRepository: jest.Mocked<IQueueRepository>;
	let mockRestaurantServiceClient: jest.Mocked<IRestaurantServiceClient>;
	let mockEtaService: jest.Mocked<IEtaService>;
	let useCase: GetQueueEtaUseCase;

	const defaultInput = {
		restaurantId: 'rest-uuid-1',
		partySize: 4,
	};

	const validRestaurantStatus = {
		restaurantId: 'rest-uuid-1',
		restaurantName: 'Test Diner',
		verificationStatus: 'VERIFIED',
		isBlocked: false,
		blockReason: null,
		isSubscriptionActive: true,
		subscriptionPlanCode: SUBSCRIPTION_PLAN.QUEUE_PRO,
		subscriptionEndsAt: '2026-12-31T23:59:59Z',
	};

	const openTableCheck = {
		restaurantId: 'rest-uuid-1',
		isOpen: true,
		acceptsQueue: true,
		isTableAvailable: false,
		availableCount: 0,
	};

	beforeEach(() => {
		mockQueueRepository = {
			findById: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
			save: jest.fn(),
			findPaginated: jest.fn(),
			findActiveEntries: jest.fn(),
			countActiveAhead: jest.fn(),
			sumPartySizeActiveAhead: jest.fn(),
			getActiveQueueMetrics: jest.fn().mockResolvedValue({
				queueDepth: 3,
				totalPeopleAhead: 10,
			}),
			countToday: jest.fn(),
			findActiveByPhone: jest.fn(),
			findActiveByUserIdAndRestaurantId: jest.fn(),
			findActiveByUserId: jest.fn(),
			createWithHistory: jest.fn(),
			assignTablesWithHistory: jest.fn(),
		};

		mockRestaurantServiceClient = {
			getRestaurantStatus: jest.fn().mockResolvedValue(validRestaurantStatus),
			checkAvailability: jest.fn().mockResolvedValue(openTableCheck),
			assignTables: jest.fn(),
		};

		mockEtaService = {
			predictEta: jest.fn().mockResolvedValue(25),
		};

		useCase = new GetQueueEtaUseCase(
			mockQueueRepository,
			mockRestaurantServiceClient,
			mockEtaService,
		);
	});

	it('should throw RestaurantBlockedError if restaurant is blocked', async () => {
		mockRestaurantServiceClient.getRestaurantStatus.mockResolvedValueOnce({
			...validRestaurantStatus,
			isBlocked: true,
			blockReason: 'Policy violation',
		});

		await expect(useCase.execute(defaultInput)).rejects.toThrow(RestaurantBlockedError);
		expect(mockRestaurantServiceClient.checkAvailability).not.toHaveBeenCalled();
	});

	it('should throw SubscriptionRequiredError if subscription is not active', async () => {
		mockRestaurantServiceClient.getRestaurantStatus.mockResolvedValueOnce({
			...validRestaurantStatus,
			isSubscriptionActive: false,
		});

		await expect(useCase.execute(defaultInput)).rejects.toThrow(SubscriptionRequiredError);
	});

	it('should throw RestaurantNotAcceptingQueueError if restaurant is closed', async () => {
		mockRestaurantServiceClient.checkAvailability.mockResolvedValueOnce({
			...openTableCheck,
			isOpen: false,
		});

		await expect(useCase.execute(defaultInput)).rejects.toThrow(RestaurantNotAcceptingQueueError);
	});

	it('should throw RestaurantNotAcceptingQueueError if restaurant queues are disabled', async () => {
		mockRestaurantServiceClient.checkAvailability.mockResolvedValueOnce({
			...openTableCheck,
			acceptsQueue: false,
		});

		await expect(useCase.execute(defaultInput)).rejects.toThrow(RestaurantNotAcceptingQueueError);
	});

	it('should return 0 minutes wait if open table is available and queue is empty', async () => {
		mockRestaurantServiceClient.checkAvailability.mockResolvedValueOnce({
			...openTableCheck,
			isTableAvailable: true,
			availableCount: 2,
		});
		mockQueueRepository.getActiveQueueMetrics.mockResolvedValueOnce({
			queueDepth: 0,
			totalPeopleAhead: 0,
		});

		const result = await useCase.execute(defaultInput);

		expect(result.estimatedWaitMinutes).toBe(0);
		expect(result.queueDepth).toBe(0);
		expect(mockEtaService.predictEta).not.toHaveBeenCalled();
	});

	it('should call predictEta and return fallback/ML ETA when tables are full even with 0 people ahead', async () => {
		mockRestaurantServiceClient.checkAvailability.mockResolvedValueOnce({
			...openTableCheck,
			isTableAvailable: false,
		});
		mockQueueRepository.getActiveQueueMetrics.mockResolvedValueOnce({
			queueDepth: 0,
			totalPeopleAhead: 0,
		});
		mockEtaService.predictEta.mockResolvedValueOnce(5);

		const result = await useCase.execute(defaultInput);

		expect(mockEtaService.predictEta).toHaveBeenCalledWith('rest-uuid-1', 0, 4);
		expect(result.estimatedWaitMinutes).toBe(5);
		expect(result.queueDepth).toBe(0);
	});

	it('should return genuine queueDepth without overwriting when totalPeopleAhead is 0 but queueDepth > 0', async () => {
		mockQueueRepository.getActiveQueueMetrics.mockResolvedValueOnce({
			queueDepth: 2,
			totalPeopleAhead: 0,
		});
		mockEtaService.predictEta.mockResolvedValueOnce(5);

		const result = await useCase.execute(defaultInput);

		expect(result.queueDepth).toBe(2);
		expect(result.estimatedWaitMinutes).toBe(5);
	});

	it('should calculate and return ETA and queue depth for active queue', async () => {
		const result = await useCase.execute(defaultInput);

		expect(mockRestaurantServiceClient.checkAvailability).toHaveBeenCalledWith('rest-uuid-1', 4);
		expect(mockQueueRepository.getActiveQueueMetrics).toHaveBeenCalledWith('rest-uuid-1');
		expect(mockEtaService.predictEta).toHaveBeenCalledWith('rest-uuid-1', 10, 4);
		expect(result).toEqual({
			restaurantId: 'rest-uuid-1',
			partySize: 4,
			estimatedWaitMinutes: 25,
			queueDepth: 3,
			calculatedAt: expect.any(String),
		});
	});
});
