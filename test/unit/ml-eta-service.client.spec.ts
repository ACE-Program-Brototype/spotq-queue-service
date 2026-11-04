import axios from 'axios';
import { MlEtaServiceClient } from '../../src/infrastructure/external/ml-eta-service.client.ts';
import { logger } from '../../src/infrastructure/logger/index.ts';
import { ETA_CONSTANTS } from '../../src/shared/constants/eta.constants.ts';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('MlEtaServiceClient Circuit Breaker Integration', () => {
	let client: MlEtaServiceClient;
	let warnSpy: jest.SpyInstance;
	let infoSpy: jest.SpyInstance;
	let axiosGetSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		warnSpy = jest
			.spyOn(logger, 'warn')
			.mockImplementation((() => {}) as unknown as typeof logger.warn);
		infoSpy = jest
			.spyOn(logger, 'info')
			.mockImplementation((() => {}) as unknown as typeof logger.info);
		axiosGetSpy = jest.spyOn(axios, 'get');
	});

	afterEach(() => {
		if (client) {
			(client as unknown as { breaker?: { shutdown: () => void } }).breaker?.shutdown();
		}
		jest.restoreAllMocks();
	});

	it('should return ML prediction when downstream service is healthy', async () => {
		axiosGetSpy.mockResolvedValueOnce({
			data: { estimated_wait_minutes: 18.4 },
		});

		client = new MlEtaServiceClient('http://test-ml:8000', 500, {
			volumeThreshold: 1,
		});

		const eta = await client.predictEta('rest-1', 4, 2);

		expect(eta).toBe(18);
		expect(axiosGetSpy).toHaveBeenCalledTimes(1);
	});

	it('should return fallback ETA when ML prediction returns non-finite numbers (Infinity, -Infinity, NaN)', async () => {
		client = new MlEtaServiceClient('http://test-ml:8000', 500, {
			volumeThreshold: 10,
		});

		const totalPeopleAhead = 4;
		const expectedFallback = Math.max(
			ETA_CONSTANTS.BASE_FALLBACK_MINUTES,
			Math.round(totalPeopleAhead * ETA_CONSTANTS.FALLBACK_MINUTES_PER_PERSON),
		);

		for (const nonFiniteValue of [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN]) {
			axiosGetSpy.mockResolvedValueOnce({
				data: { estimated_wait_minutes: nonFiniteValue },
			});

			const eta = await client.predictEta('rest-1', totalPeopleAhead, 2);
			expect(eta).toBe(expectedFallback);
		}
	});

	it('AC 4: should immediately return deterministic fallback ETA when call fails', async () => {
		axiosGetSpy.mockRejectedValue(new Error('Internal Server Error 500'));

		client = new MlEtaServiceClient('http://test-ml:8000', 100, {
			volumeThreshold: 1,
			errorThresholdPercentage: 50,
			resetTimeoutMs: 100,
		});

		const totalPeopleAhead = 5;
		const expectedFallback = Math.max(
			ETA_CONSTANTS.BASE_FALLBACK_MINUTES,
			Math.round(totalPeopleAhead * ETA_CONSTANTS.FALLBACK_MINUTES_PER_PERSON),
		);

		const result1 = await client.predictEta('rest-1', totalPeopleAhead, 2);
		expect(result1).toBe(expectedFallback);

		// AC 4: Next call should fast-fallback without calling Axios (0 Axios calls)
		const axiosCallCount = axiosGetSpy.mock.calls.length;
		const result2 = await client.predictEta('rest-1', totalPeopleAhead, 2);
		expect(result2).toBe(expectedFallback);
		expect(axiosGetSpy.mock.calls.length).toBe(axiosCallCount);
	});

	it('AC 4: should invoke fallback on timeout and abort in-flight Axios request', async () => {
		let capturedSignal: AbortSignal | undefined;
		axiosGetSpy.mockImplementation((_url, config) => {
			capturedSignal = config?.signal;
			return new Promise((resolve) =>
				setTimeout(() => resolve({ data: { estimated_wait_minutes: 25 } }), 150),
			);
		});

		client = new MlEtaServiceClient('http://test-ml:8000', 30, {
			volumeThreshold: 1,
			timeoutMs: 30,
			resetTimeoutMs: 100,
		});

		const totalPeopleAhead = 3;
		const expectedFallback = Math.max(
			ETA_CONSTANTS.BASE_FALLBACK_MINUTES,
			Math.round(totalPeopleAhead * ETA_CONSTANTS.FALLBACK_MINUTES_PER_PERSON),
		);

		const result = await client.predictEta('rest-1', totalPeopleAhead, 2);
		expect(result).toBe(expectedFallback);
		expect(capturedSignal?.aborted).toBe(true);
	});

	it('AC 7: should log warning on trip to OPEN and info on recovery to CLOSED', async () => {
		let shouldFail = true;
		axiosGetSpy.mockImplementation(async () => {
			if (shouldFail) {
				throw new Error('Connection refused');
			}
			return { data: { estimated_wait_minutes: 12 } };
		});

		client = new MlEtaServiceClient('http://test-ml:8000', 500, {
			volumeThreshold: 1,
			errorThresholdPercentage: 1,
			resetTimeoutMs: 50,
		});

		// Trigger failure -> trips OPEN
		await client.predictEta('rest-1', 2, 2);
		expect(warnSpy).toHaveBeenCalledWith(
			expect.objectContaining({ service: 'ml-eta-service' }),
			expect.stringContaining('tripped to OPEN'),
		);

		// Wait for resetTimeoutMs -> HALF_OPEN, then recover with successful trial request
		await sleep(80);
		shouldFail = false;
		const recoveredEta = await client.predictEta('rest-1', 2, 2);
		expect(recoveredEta).toBe(12);
		expect(infoSpy).toHaveBeenCalledWith(
			expect.objectContaining({ service: 'ml-eta-service' }),
			expect.stringContaining('recovered to CLOSED'),
		);
	});
});
