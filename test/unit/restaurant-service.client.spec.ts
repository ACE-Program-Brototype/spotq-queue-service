import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import {
	RestaurantNotFoundError,
	UpstreamServiceUnavailableError,
} from '../../src/domain/index.ts';
import { RestaurantServiceClient } from '../../src/infrastructure/external/restaurant-service.client.ts';
import { logger } from '../../src/infrastructure/logger/index.ts';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('RestaurantServiceClient Circuit Breaker Integration', () => {
	let client: RestaurantServiceClient;
	let warnSpy: jest.SpyInstance;
	let infoSpy: jest.SpyInstance;
	let axiosGetSpy: jest.SpyInstance;
	let axiosPatchSpy: jest.SpyInstance;

	function createAxiosError(status: number, message: string): AxiosError {
		const error = new AxiosError(message);
		error.response = {
			status,
			statusText: message,
			data: { message },
			headers: {},
			config: {} as InternalAxiosRequestConfig,
		};
		return error;
	}

	beforeEach(() => {
		jest.clearAllMocks();
		warnSpy = jest
			.spyOn(logger, 'warn')
			.mockImplementation((() => {}) as unknown as typeof logger.warn);
		infoSpy = jest
			.spyOn(logger, 'info')
			.mockImplementation((() => {}) as unknown as typeof logger.info);
		axiosGetSpy = jest.spyOn(axios, 'get');
		axiosPatchSpy = jest.spyOn(axios, 'patch');
	});

	afterEach(() => {
		if (client) {
			(client as unknown as { breaker?: { shutdown: () => void } }).breaker?.shutdown();
		}
		jest.restoreAllMocks();
	});

	describe('AC 5: Fast-Fail on Circuit OPEN', () => {
		it('should trip to OPEN after failure threshold and fast-fail subsequent calls in 0ms without network I/O', async () => {
			axiosGetSpy.mockRejectedValue(createAxiosError(500, 'Internal Server Error'));

			client = new RestaurantServiceClient(
				'http://restaurant-svc:3001',
				false,
				'queue-service',
				undefined,
				'restaurant-service',
				500,
				{
					volumeThreshold: 2,
					errorThresholdPercentage: 50,
					resetTimeoutMs: 100,
				},
			);

			// Call 1: fails
			await expect(client.getRestaurantStatus('rest-1')).rejects.toThrow(
				UpstreamServiceUnavailableError,
			);

			// Call 2: fails -> trips breaker to OPEN
			await expect(client.getRestaurantStatus('rest-1')).rejects.toThrow(
				UpstreamServiceUnavailableError,
			);

			// Call 3: Circuit is OPEN -> Fast-fails immediately without touching Axios
			const getCallsBefore = axiosGetSpy.mock.calls.length;
			await expect(client.getRestaurantStatus('rest-1')).rejects.toThrow(
				'Restaurant service is temporarily unavailable (circuit open)',
			);
			expect(axiosGetSpy.mock.calls.length).toBe(getCallsBefore);

			// Call 4 on another endpoint (e.g. checkAvailability or assignTables) also fast-fails (unified breaker)
			await expect(client.checkAvailability('rest-1', 4)).rejects.toThrow(
				'Restaurant service is temporarily unavailable (circuit open)',
			);
			expect(axiosGetSpy.mock.calls.length).toBe(getCallsBefore);

			const patchCallsBefore = axiosPatchSpy.mock.calls.length;
			await expect(client.assignTables('rest-1', [{ tableId: 't1', count: 2 }])).rejects.toThrow(
				'Restaurant service is temporarily unavailable (circuit open)',
			);
			expect(axiosPatchSpy.mock.calls.length).toBe(patchCallsBefore);
		});
	});

	describe('AC 6: 404 Exemption', () => {
		it('should not increment failure stats or trip the circuit breaker on 404 RestaurantNotFoundError', async () => {
			axiosGetSpy.mockRejectedValue(createAxiosError(404, 'Restaurant not found'));

			client = new RestaurantServiceClient(
				'http://restaurant-svc:3001',
				false,
				'queue-service',
				undefined,
				'restaurant-service',
				500,
				{
					volumeThreshold: 1,
					errorThresholdPercentage: 1,
				},
			);

			// Repeat 404 calls 3 times
			for (let i = 0; i < 3; i++) {
				await expect(client.getRestaurantStatus('unknown-restaurant')).rejects.toThrow(
					RestaurantNotFoundError,
				);
			}

			// Downstream calls were made each time (circuit did NOT trip OPEN)
			expect(axiosGetSpy).toHaveBeenCalledTimes(3);
		});

		it('should not increment failure stats or trip circuit breaker on 4xx UpstreamServiceUnavailableError (e.g. 400 Bad Request)', async () => {
			axiosGetSpy.mockRejectedValue(createAxiosError(400, 'Bad party size'));

			client = new RestaurantServiceClient(
				'http://restaurant-svc:3001',
				false,
				'queue-service',
				undefined,
				'restaurant-service',
				500,
				{
					volumeThreshold: 1,
					errorThresholdPercentage: 1,
				},
			);

			// Repeat 400 Bad Request calls 3 times
			for (let i = 0; i < 3; i++) {
				await expect(client.getRestaurantStatus('rest-1')).rejects.toThrow(
					UpstreamServiceUnavailableError,
				);
			}

			// Downstream calls were made each time (circuit did NOT trip OPEN because 400 is a client error)
			expect(axiosGetSpy).toHaveBeenCalledTimes(3);
		});
	});

	describe('AC 7: Observability (Logging)', () => {
		it('should log structured warning on trip to OPEN and info on recovery to CLOSED', async () => {
			let fail = true;
			axiosGetSpy.mockImplementation(async () => {
				if (fail) {
					throw createAxiosError(503, 'Service unavailable');
				}
				return {
					data: {
						success: true,
						data: {
							restaurantId: 'rest-1',
							restaurantName: 'Test Diner',
							verificationStatus: 'VERIFIED',
							isOpen: true,
							isBlocked: false,
							blockReason: null,
							isSubscriptionActive: true,
							subscriptionPlanCode: 'QUEUE_PRO',
							subscriptionEndsAt: null,
							hasActiveQueueProSubscription: true,
							queueProPlan: 'QUEUE_PRO',
						},
					},
				};
			});

			client = new RestaurantServiceClient(
				'http://restaurant-svc:3001',
				false,
				'queue-service',
				undefined,
				'restaurant-service',
				500,
				{
					volumeThreshold: 1,
					errorThresholdPercentage: 1,
					resetTimeoutMs: 60,
				},
			);

			// Trip breaker
			await expect(client.getRestaurantStatus('rest-1')).rejects.toThrow(
				UpstreamServiceUnavailableError,
			);
			expect(warnSpy).toHaveBeenCalledWith(
				expect.objectContaining({ service: 'restaurant-service' }),
				expect.stringContaining('tripped to OPEN'),
			);

			// Wait for resetTimeoutMs -> HALF_OPEN
			await sleep(90);
			expect(infoSpy).toHaveBeenCalledWith(
				expect.objectContaining({ service: 'restaurant-service' }),
				expect.stringContaining('entered HALF_OPEN'),
			);

			// Successful trial probe -> recovers to CLOSED
			fail = false;
			const res = await client.getRestaurantStatus('rest-1');
			expect(res.restaurantId).toBe('rest-1');
			expect(infoSpy).toHaveBeenCalledWith(
				expect.objectContaining({ service: 'restaurant-service' }),
				expect.stringContaining('recovered to CLOSED'),
			);
		});
	});

	describe('Healthy Operations & Mocks', () => {
		it('should succeed with normal getRestaurantStatus, checkAvailability, and assignTables when downstream is healthy', async () => {
			axiosGetSpy.mockResolvedValueOnce({
				data: {
					success: true,
					data: {
						restaurantId: 'rest-1',
						restaurantName: 'Test Diner',
						verificationStatus: 'VERIFIED',
						isOpen: true,
						isBlocked: false,
						blockReason: null,
						isSubscriptionActive: true,
						subscriptionPlanCode: 'QUEUE_PRO',
						subscriptionEndsAt: null,
						hasActiveQueueProSubscription: true,
					},
				},
			});

			axiosGetSpy.mockResolvedValueOnce({
				data: {
					success: true,
					data: {
						restaurantId: 'rest-1',
						isOpen: true,
						acceptsQueue: true,
						isTableAvailable: true,
						availableCount: 2,
					},
				},
			});

			axiosPatchSpy.mockResolvedValueOnce({
				data: { success: true },
			});

			client = new RestaurantServiceClient(
				'http://restaurant-svc:3001',
				false,
				'queue-service',
				undefined,
				'restaurant-service',
				1000,
			);

			const status = await client.getRestaurantStatus('rest-1');
			expect(status.restaurantId).toBe('rest-1');

			const availability = await client.checkAvailability('rest-1', 2);
			expect(availability.isTableAvailable).toBe(true);

			await expect(
				client.assignTables('rest-1', [{ tableId: 't1', count: 2 }]),
			).resolves.not.toThrow();
		});

		it('should bypass network and circuit breaker when useMock is true for checkAvailability', async () => {
			axiosGetSpy.mockRejectedValue(createAxiosError(500, 'Downstream down'));

			client = new RestaurantServiceClient(
				'http://restaurant-svc:3001',
				true, // useMock
			);

			const result = await client.checkAvailability('rest-1', 2);
			expect(result.restaurantId).toBe('rest-1');
			expect(result.isTableAvailable).toBe(false);
			expect(axiosGetSpy).not.toHaveBeenCalled();
		});
	});

	describe('Timeout & Request Cancellation', () => {
		it('should abort in-flight Axios request when circuit breaker times out', async () => {
			let capturedSignal: AbortSignal | undefined;
			axiosGetSpy.mockImplementation((_url, config) => {
				capturedSignal = config?.signal;
				return new Promise((resolve) => setTimeout(resolve, 200));
			});

			client = new RestaurantServiceClient(
				'http://restaurant-svc:3001',
				false,
				'queue-service',
				undefined,
				'restaurant-service',
				100,
				{
					timeoutMs: 30,
				},
			);

			await expect(client.getRestaurantStatus('rest-1')).rejects.toThrow(
				UpstreamServiceUnavailableError,
			);
			expect(capturedSignal?.aborted).toBe(true);
		});
	});
});
