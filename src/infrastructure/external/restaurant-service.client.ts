import type {
	IRestaurantServiceClient,
	RestaurantStatusResult,
	TableAvailabilityResult,
} from '@application/ports/services/restaurant-service.port.ts';
import { RestaurantNotFoundError } from '@domain/index.ts';
import { config } from '@infrastructure/config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import axios from 'axios';
import { injectable, unmanaged } from 'inversify';

/**
 * HTTP Client implementation for communicating with spotq-restaurant-service.
 *
 * Responsibilities:
 * - Queries internal table availability endpoint.
 * - Queries restaurant status, block state, and QUEUE_PRO subscription eligibility.
 * - Handles connection timeouts, errors, and provides resilient fallback.
 * - Supports mocking during local development and testing when MOCK_TABLE_CHECK=true.
 */
@injectable()
export class RestaurantServiceClient implements IRestaurantServiceClient {
	private readonly baseUrl: string;
	private readonly useMock: boolean;
	private static readonly REQUEST_TIMEOUT_MS = 2000;

	constructor(
		@unmanaged()
		baseUrl: string = config.services.restaurantServiceUrl,
		@unmanaged()
		useMock: boolean = config.services.mockTableCheck,
	) {
		this.baseUrl = baseUrl.replace(/\/$/, '');
		this.useMock = useMock;
	}

	/**
	 * Retrieves the current status, block state, and subscription details for a restaurant.
	 *
	 * @param restaurantId - Target restaurant unique identifier
	 * @returns Promise resolving to RestaurantStatusResult
	 */
	async getRestaurantStatus(restaurantId: string): Promise<RestaurantStatusResult> {
		if (this.useMock) {
			logger.info(
				{ restaurantId },
				'[MOCK] Simulating restaurant status check: active QUEUE_PRO subscription (isBlocked=false)',
			);
			return {
				restaurantId,
				restaurantName: 'Mock Restaurant',
				verificationStatus: 'ACTIVE',
				isBlocked: false,
				blockReason: null,
				isSubscriptionActive: true,
				subscriptionPlanCode: 'QUEUE_PRO',
				subscriptionEndsAt: new Date(Date.now() + 86400000 * 365).toISOString(),
				canAccessQueueService: true,
			};
		}

		try {
			const url = `${this.baseUrl}/api/internal/v1/restaurants/${encodeURIComponent(restaurantId)}/validation`;
			const response = await axios.get<{ data: RestaurantStatusResult }>(url, {
				timeout: RestaurantServiceClient.REQUEST_TIMEOUT_MS,
				headers: {
					Accept: 'application/json',
					'X-Internal-Service': 'spotq-queue-service',
				},
			});

			return response.data.data;
		} catch (error) {
			if (axios.isAxiosError(error) && error.response?.status === 404) {
				throw new RestaurantNotFoundError(restaurantId);
			}

			logger.error(
				{ err: error, restaurantId },
				'Failed to call spotq-restaurant-service restaurant status API. Falling back to default queue acceptance.',
			);

			// Resilient fallback: Allow operation during transient network interruption
			return {
				restaurantId,
				restaurantName: 'Fallback Restaurant',
				verificationStatus: 'ACTIVE',
				isBlocked: false,
				blockReason: null,
				isSubscriptionActive: true,
				subscriptionPlanCode: 'QUEUE_PRO',
				subscriptionEndsAt: null,
				canAccessQueueService: true,
			};
		}
	}

	/**
	 * Inquires whether the restaurant is accepting queues and whether an immediate table is free.
	 *
	 * @param restaurantId - Target restaurant unique identifier
	 * @param partySize - Size of arriving guest group
	 * @returns Promise resolving to TableAvailabilityResult
	 */
	async checkAvailability(
		restaurantId: string,
		partySize: number,
	): Promise<TableAvailabilityResult> {
		if (this.useMock) {
			logger.info(
				{ restaurantId, partySize },
				'[MOCK] Simulating table availability check: tables occupied (isTableAvailable=false)',
			);
			return {
				restaurantId,
				isOpen: true,
				acceptsQueue: true,
				isTableAvailable: false,
				availableCount: 0,
			};
		}

		try {
			const url = `${this.baseUrl}/api/internal/v1/restaurants/${encodeURIComponent(restaurantId)}/tables/availability`;
			const response = await axios.get<{ data: TableAvailabilityResult }>(url, {
				params: { partySize },
				timeout: RestaurantServiceClient.REQUEST_TIMEOUT_MS,
				headers: {
					Accept: 'application/json',
				},
			});

			return response.data.data;
		} catch (error) {
			logger.error(
				{ err: error, restaurantId },
				'Failed to call spotq-restaurant-service table check API via axios. Falling back to default queue acceptance.',
			);
			// Resilient fallback: Allow walk-in registration if availability service cannot be reached
			return {
				restaurantId,
				isOpen: true,
				acceptsQueue: true,
				isTableAvailable: false,
				availableCount: 0,
			};
		}
	}
}

export const restaurantServiceClient = new RestaurantServiceClient();
