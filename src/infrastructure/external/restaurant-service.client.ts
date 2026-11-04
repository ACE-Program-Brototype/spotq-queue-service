import type {
	AssignTableItem,
	IRestaurantServiceClient,
	ReleaseTableItem,
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
import { QUEUE_MESSAGES } from '@shared/constants/message.constants.ts';
import { RESTAURANT_SERVICE_ROUTES } from '@shared/constants/routes.constants.ts';
import {
	CircuitBreaker,
	CircuitBreakerOpenError,
	type CircuitBreakerOptions,
	CircuitBreakerTimeoutError,
} from '@spotq-org/circuit-breaker';
import { generateToken, type TokenIssuerConfig } from '@spotq-org/s2s-core';
import axios from 'axios';
import { injectable } from 'inversify';

interface IApiResponseEnvelope<T> {
	success?: boolean;
	data?: T;
	message?: string;
	error?: string;
}

export const RESTAURANT_CLIENT_CONSTANTS = {
	REQUEST_TIMEOUT_MS: 1500,
} as const;

/**
 * HTTP Client implementation for communicating with spotq-restaurant-service.
 *
 * Responsibilities:
 * - Queries internal table availability endpoint.
 * - Queries restaurant status, block state, and QUEUE_PRO subscription eligibility.
 * - Authenticates requests using asymmetric RS256 S2S JWT tokens via @spotq-org/s2s-core.
 * - Protects outbound S2S calls with a unified circuit breaker (@spotq-org/circuit-breaker).
 * - Fast-fails in 0ms on circuit OPEN with UpstreamServiceUnavailableError.
 * - Excludes 404 RestaurantNotFoundError from circuit failure statistics.
 * - Supports mocking during local development and testing when MOCK_TABLE_CHECK=true.
 */
@injectable()
export class RestaurantServiceClient implements IRestaurantServiceClient {
	public static readonly REQUEST_TIMEOUT_MS = RESTAURANT_CLIENT_CONSTANTS.REQUEST_TIMEOUT_MS;

	private readonly baseUrl: string;
	private readonly useMock: boolean;
	private readonly s2sServiceName: string;
	private readonly s2sPrivateKey?: string;
	private readonly targetServiceName: string;
	private readonly timeoutMs: number;
	private readonly requestTimeoutMs: number;
	private readonly breaker: CircuitBreaker<[() => Promise<unknown>], unknown>;

	constructor(
		baseUrl: string = config.services.restaurantServiceUrl,
		useMock: boolean = config.services.mockTableCheck,
		s2sServiceName: string = config.s2s.serviceName,
		s2sPrivateKey: string | undefined = config.s2s.privateKey,
		targetServiceName: string = config.services.restaurantServiceName,
		timeoutMs: number = config.circuitBreakers.restaurant.timeoutMs,
		breakerOptions?: Partial<CircuitBreakerOptions<[() => Promise<unknown>], unknown>>,
		requestTimeoutMs: number = RestaurantServiceClient.REQUEST_TIMEOUT_MS,
	) {
		this.baseUrl = baseUrl.replace(/\/$/, '');
		this.useMock = useMock;
		this.s2sServiceName = s2sServiceName;
		this.s2sPrivateKey = s2sPrivateKey;
		this.targetServiceName = targetServiceName;
		this.timeoutMs = timeoutMs;
		this.requestTimeoutMs = requestTimeoutMs;
		const breakerTimeoutMs = breakerOptions?.timeoutMs ?? this.timeoutMs;

		this.breaker = new CircuitBreaker(
			async (operation: () => Promise<unknown>) => await operation(),
			{
				name: this.targetServiceName,
				timeoutMs: breakerTimeoutMs,
				resetTimeoutMs: config.circuitBreakers.restaurant.resetTimeoutMs,
				errorThresholdPercentage: config.circuitBreakers.restaurant.errorThresholdPercentage,
				volumeThreshold: config.circuitBreakers.restaurant.volumeThreshold,
				checkIsFailure: (err) => {
					if (err instanceof RestaurantNotFoundError) {
						return false;
					}
					if (err instanceof UpstreamServiceUnavailableError) {
						const statusCode = (err.details as { upstreamStatusCode?: number })?.upstreamStatusCode;
						if (
							statusCode &&
							statusCode >= HTTP_STATUS.BAD_REQUEST &&
							statusCode < HTTP_STATUS.INTERNAL_SERVER_ERROR
						) {
							return false;
						}
						return true;
					}
					if (err instanceof DomainError) {
						return false;
					}
					if (axios.isAxiosError(err)) {
						if (err.response?.status === HTTP_STATUS.NOT_FOUND) {
							return false;
						}
						if (
							err.response?.status &&
							err.response.status >= HTTP_STATUS.BAD_REQUEST &&
							err.response.status < HTTP_STATUS.INTERNAL_SERVER_ERROR
						) {
							return false;
						}
					}
					return true;
				},
				onOpen: () => {
					logger.warn(
						{ service: this.targetServiceName },
						'Restaurant service circuit breaker tripped to OPEN; fast-failing subsequent requests',
					);
				},
				onClose: () => {
					logger.info(
						{ service: this.targetServiceName },
						'Restaurant service circuit breaker recovered to CLOSED',
					);
				},
				onHalfOpen: () => {
					logger.info(
						{ service: this.targetServiceName },
						'Restaurant service circuit breaker entered HALF_OPEN; testing trial probe',
					);
				},
				...breakerOptions,
			},
		);
	}

	/**
	 * Executes an upstream operation through the circuit breaker, fast-failing if OPEN.
	 */
	private async executeWithBreaker<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
		const controller = new AbortController();
		try {
			return (await this.breaker.execute(async () => await operation(controller.signal))) as T;
		} catch (error) {
			controller.abort();
			if (error instanceof CircuitBreakerOpenError) {
				logger.warn(
					{ service: this.targetServiceName },
					'Restaurant service circuit breaker is OPEN; fast-failing request',
				);
				throw new UpstreamServiceUnavailableError(
					'Restaurant service is temporarily unavailable (circuit open)',
					{ upstreamStatusCode: HTTP_STATUS.SERVICE_UNAVAILABLE },
				);
			}
			if (error instanceof CircuitBreakerTimeoutError) {
				logger.error(
					{ service: this.targetServiceName, err: error },
					'Restaurant service request timed out via circuit breaker',
				);
				throw new UpstreamServiceUnavailableError(
					`Restaurant service timed out after ${error.timeoutMs ?? this.timeoutMs}ms`,
					{ upstreamStatusCode: HTTP_STATUS.SERVICE_UNAVAILABLE },
				);
			}
			throw error;
		}
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
				const token = generateToken(this.targetServiceName, issuerConfig);
				headers.Authorization = `Bearer ${token}`;
			} catch (error) {
				logger.error(
					{ err: error, targetService: this.targetServiceName },
					'Failed to generate S2S token for restaurant-service',
				);
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
		return this.executeWithBreaker(async (signal) => {
			try {
				const url = `${this.baseUrl}${RESTAURANT_SERVICE_ROUTES.VALIDATION(restaurantId)}`;
				const response = await axios.get<IApiResponseEnvelope<RestaurantStatusResult>>(url, {
					signal,
					timeout: this.requestTimeoutMs,
					headers: this.getInternalHeaders(),
				});

				if (response.data?.success !== true || !response.data.data) {
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
					if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
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
						error.response?.status &&
						error.response.status >= HTTP_STATUS.BAD_REQUEST &&
						error.response.status < HTTP_STATUS.INTERNAL_SERVER_ERROR
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
		});
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

		return this.executeWithBreaker(async (signal) => {
			try {
				const url = `${this.baseUrl}${RESTAURANT_SERVICE_ROUTES.TABLE_AVAILABILITY(restaurantId)}`;
				const response = await axios.get<IApiResponseEnvelope<TableAvailabilityResult>>(url, {
					signal,
					params: { partySize },
					timeout: this.requestTimeoutMs,
					headers: this.getInternalHeaders(),
				});

				if (response.data?.success !== true || !response.data.data) {
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
					if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
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
						error.response?.status &&
						error.response.status >= HTTP_STATUS.BAD_REQUEST &&
						error.response.status < HTTP_STATUS.INTERNAL_SERVER_ERROR
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
		});
	}

	async assignTables(restaurantId: string, tables: AssignTableItem[]): Promise<void> {
		return this.executeWithBreaker(async (signal) => {
			try {
				const url = `${this.baseUrl}${RESTAURANT_SERVICE_ROUTES.ASSIGN_TABLE(restaurantId)}`;
				const response = await axios.patch<IApiResponseEnvelope<null>>(
					url,
					{ tables },
					{
						signal,
						timeout: this.requestTimeoutMs,
						headers: this.getInternalHeaders(),
					},
				);

				if (response.data?.success !== true) {
					const errorMessage =
						response.data?.message || QUEUE_MESSAGES.TABLE_ASSIGNMENT_FAILED_UPSTREAM;
					throw new UpstreamServiceUnavailableError(errorMessage);
				}
			} catch (error) {
				if (error instanceof DomainError) {
					throw error;
				}

				if (axios.isAxiosError(error)) {
					if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
						throw new RestaurantNotFoundError(restaurantId);
					}

					const upstreamMessage =
						(error.response?.data as { message?: string })?.message ||
						`${QUEUE_MESSAGES.TABLE_ASSIGNMENT_ERROR_PREFIX}: ${error.message}`;

					logger.error(
						{ err: error, restaurantId, tables, upstreamMessage },
						'Failed to call spotq-restaurant-service table assignment API via axios',
					);

					const statusCode =
						error.response?.status &&
						error.response.status >= HTTP_STATUS.BAD_REQUEST &&
						error.response.status < HTTP_STATUS.INTERNAL_SERVER_ERROR
							? error.response.status
							: HTTP_STATUS.SERVICE_UNAVAILABLE;

					throw new UpstreamServiceUnavailableError(upstreamMessage, {
						upstreamStatusCode: statusCode,
					});
				}

				logger.error(
					{ err: error, restaurantId, tables },
					'Unexpected error during table assignment',
				);
				throw new UpstreamServiceUnavailableError(
					'Unexpected error communicating with restaurant service',
				);
			}
		});
	}

	async releaseTables(restaurantId: string, tables: ReleaseTableItem[]): Promise<void> {
		return this.executeWithBreaker(async (signal) => {
			try {
				const url = `${this.baseUrl}${RESTAURANT_SERVICE_ROUTES.RELEASE_TABLE(restaurantId)}`;
				const response = await axios.patch<IApiResponseEnvelope<null>>(
					url,
					{ tables },
					{
						signal,
						timeout: this.requestTimeoutMs,
						headers: this.getInternalHeaders(),
					},
				);

				if (response.data?.success !== true) {
					const errorMessage =
						response.data?.message || QUEUE_MESSAGES.TABLE_RELEASE_FAILED_UPSTREAM;
					throw new UpstreamServiceUnavailableError(errorMessage);
				}
			} catch (error) {
				if (error instanceof DomainError) {
					throw error;
				}

				if (axios.isAxiosError(error)) {
					if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
						throw new RestaurantNotFoundError(restaurantId);
					}

					const upstreamMessage =
						(error.response?.data as { message?: string })?.message ||
						`${QUEUE_MESSAGES.TABLE_RELEASE_ERROR_PREFIX}: ${error.message}`;

					logger.error(
						{ err: error, restaurantId, tables, upstreamMessage },
						'Failed to call spotq-restaurant-service table release API via axios',
					);

					const statusCode =
						error.response?.status &&
						error.response.status >= HTTP_STATUS.BAD_REQUEST &&
						error.response.status < HTTP_STATUS.INTERNAL_SERVER_ERROR
							? error.response.status
							: HTTP_STATUS.SERVICE_UNAVAILABLE;

					throw new UpstreamServiceUnavailableError(upstreamMessage, {
						upstreamStatusCode: statusCode,
					});
				}

				logger.error({ err: error, restaurantId, tables }, 'Unexpected error during table release');
				throw new UpstreamServiceUnavailableError(
					'Unexpected error communicating with restaurant service',
				);
			}
		});
	}
}
