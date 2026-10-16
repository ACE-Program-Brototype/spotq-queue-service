import type {
	IRestaurantServiceClient,
	RestaurantStatusResult,
	TableAvailabilityResult,
} from '@application/ports/services/restaurant-service.port.ts';
import {
	DomainError,
	RestaurantNotFoundError,
	UpstreamServiceUnavailableError,
} from '@domain/index.ts';
import { config } from '@infrastructure/config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { HTTP_STATUS } from '@shared/constants/http.constants.ts';
import { generateToken, type TokenIssuerConfig } from '@spotq-org/s2s-core';
import axios from 'axios';
import { injectable } from 'inversify';

interface ApiResponseEnvelope<T> {
	success?: boolean;
	data?: T;
	message?: string;
	error?: string;
}

/**
 * HTTP Client implementation for communicating with spotq-restaurant-service.
 *
 * Responsibilities:
 * - Queries internal table availability endpoint.
 * - Queries restaurant status, block state, and QUEUE_PRO subscription eligibility.
 * - Authenticates requests using asymmetric RS256 S2S JWT tokens via @spotq-org/s2s-core.
 * - Enforces response success and propagates upstream errors.
 * - Supports mocking during local development and testing when MOCK_TABLE_CHECK=true.
 */
@injectable()
export class RestaurantServiceClient implements IRestaurantServiceClient {
	private readonly baseUrl: string;
	private readonly useMock: boolean;
	private readonly s2sServiceName: string;
	private readonly s2sPrivateKey?: string;
	private static readonly REQUEST_TIMEOUT_MS = 2000;

	constructor(
		baseUrl: string = config.services.restaurantServiceUrl,
		useMock: boolean = config.services.mockTableCheck,
		s2sServiceName: string = config.s2s.serviceName,
		s2sPrivateKey: string | undefined = config.s2s.privateKey,
	) {
		this.baseUrl = baseUrl.replace(/\/$/, '');
		this.useMock = useMock;
		this.s2sServiceName = s2sServiceName;
		this.s2sPrivateKey = s2sPrivateKey;
	}

	/**
	 * Constructs the standard internal service-to-service headers including RS256 JWT bearer token.
	 */
	private getInternalHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			Accept: 'application/json',
			'x-caller-service': this.s2sServiceName,
		};

		if (this.s2sPrivateKey) {
			try {
				const issuerConfig: TokenIssuerConfig = {
					serviceName: this.s2sServiceName,
					privateKey: this.s2sPrivateKey,
				};
				const token = generateToken('restaurant-service', issuerConfig);
				headers.Authorization = `Bearer ${token}`;
			} catch (error) {
				logger.error({ err: error }, 'Failed to generate S2S token for restaurant-service');
			}
		}

		return headers;
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
			const response = await axios.get<ApiResponseEnvelope<RestaurantStatusResult>>(url, {
				timeout: RestaurantServiceClient.REQUEST_TIMEOUT_MS,
				headers: this.getInternalHeaders(),
			});

			if (!response.data || response.data.success !== true || !response.data.data) {
				const errorMessage =
					response.data?.message || 'Failed to retrieve restaurant validation status';
				throw new UpstreamServiceUnavailableError(errorMessage);
			}

			return response.data.data;
		} catch (error) {
			if (error instanceof DomainError) {
				throw error;
			}

			if (axios.isAxiosError(error)) {
				if (error.response?.status === 404) {
					throw new RestaurantNotFoundError(restaurantId);
				}

				const upstreamMessage =
					(error.response?.data as { message?: string })?.message ||
					`Restaurant service validation failed: ${error.message}`;

				logger.error(
					{ err: error, restaurantId, upstreamMessage },
					'Failed to call spotq-restaurant-service restaurant status API',
				);

				const statusCode =
					error.response?.status && error.response.status >= 400 && error.response.status < 500
						? error.response.status
						: HTTP_STATUS.SERVICE_UNAVAILABLE;

				throw new UpstreamServiceUnavailableError(upstreamMessage, {
					upstreamStatusCode: statusCode,
				});
			}

			logger.error(
				{ err: error, restaurantId },
				'Unexpected error during restaurant status validation',
			);
			throw new UpstreamServiceUnavailableError(
				'Unexpected error communicating with restaurant service',
			);
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
			const response = await axios.get<ApiResponseEnvelope<TableAvailabilityResult>>(url, {
				params: { partySize },
				timeout: RestaurantServiceClient.REQUEST_TIMEOUT_MS,
				headers: this.getInternalHeaders(),
			});

			if (!response.data || response.data.success !== true || !response.data.data) {
				const errorMessage =
					response.data?.message || 'Failed to retrieve table availability status';
				throw new UpstreamServiceUnavailableError(errorMessage);
			}

			return response.data.data;
		} catch (error) {
			if (error instanceof DomainError) {
				throw error;
			}

			if (axios.isAxiosError(error)) {
				if (error.response?.status === 404) {
					throw new RestaurantNotFoundError(restaurantId);
				}

				const upstreamMessage =
					(error.response?.data as { message?: string })?.message ||
					`Restaurant table check failed: ${error.message}`;

				logger.error(
					{ err: error, restaurantId, partySize, upstreamMessage },
					'Failed to call spotq-restaurant-service table check API via axios',
				);

				const statusCode =
					error.response?.status && error.response.status >= 400 && error.response.status < 500
						? error.response.status
						: HTTP_STATUS.SERVICE_UNAVAILABLE;

				throw new UpstreamServiceUnavailableError(upstreamMessage, {
					upstreamStatusCode: statusCode,
				});
			}

			logger.error(
				{ err: error, restaurantId, partySize },
				'Unexpected error during table availability check',
			);
			throw new UpstreamServiceUnavailableError(
				'Unexpected error communicating with restaurant service',
			);
		}
	}
}

export const restaurantServiceClient = new RestaurantServiceClient();
