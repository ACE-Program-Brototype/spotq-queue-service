import type { IEtaService } from '@application/ports/services/eta-service.port.ts';
import { config } from '@infrastructure/config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { ETA_CONSTANTS } from '@shared/constants/eta.constants.ts';
import { HTTP_STATUS } from '@shared/constants/http.constants.ts';
import { ML_ETA_SERVICE_ROUTES } from '@shared/constants/routes.constants.ts';
import { CircuitBreaker, type CircuitBreakerOptions } from '@spotq-org/circuit-breaker';
import axios from 'axios';
import { injectable } from 'inversify';

interface IMlEtaPredictionResponse {
	estimated_wait_minutes?: number;
}

@injectable()
export class MlEtaServiceClient implements IEtaService {
	private readonly baseUrl: string;
	private readonly timeoutMs: number;
	private readonly requestTimeoutMs: number;
	private readonly breaker: CircuitBreaker<
		[
			restaurantId: string,
			totalPeopleAhead: number,
			partySize: number,
			controller?: AbortController,
		],
		number
	>;

	constructor(
		baseUrl: string = config.services.etaServiceUrl,
		timeoutMs: number = config.circuitBreakers.eta.timeoutMs,
		breakerOptions?: Partial<
			CircuitBreakerOptions<
				[
					restaurantId: string,
					totalPeopleAhead: number,
					partySize: number,
					controller?: AbortController,
				],
				number
			>
		>,
		requestTimeoutMs?: number,
	) {
		this.baseUrl = baseUrl.replace(/\/$/, '');
		this.timeoutMs = breakerOptions?.timeoutMs ?? timeoutMs;
		this.requestTimeoutMs =
			requestTimeoutMs ??
			(this.timeoutMs <= ETA_CONSTANTS.REQUEST_TIMEOUT_MS
				? Math.max(1, Math.round(this.timeoutMs * 0.75))
				: ETA_CONSTANTS.REQUEST_TIMEOUT_MS);

		this.breaker = new CircuitBreaker(this.callPredictionApi, {
			name: 'ml-eta-service',
			timeoutMs: this.timeoutMs,
			resetTimeoutMs: config.circuitBreakers.eta.resetTimeoutMs,
			errorThresholdPercentage: config.circuitBreakers.eta.errorThresholdPercentage,
			volumeThreshold: config.circuitBreakers.eta.volumeThreshold,
			checkIsFailure: (err) => {
				if (
					axios.isAxiosError(err) &&
					err.response?.status &&
					err.response.status < HTTP_STATUS.INTERNAL_SERVER_ERROR
				) {
					return false;
				}
				return true;
			},
			fallback: (_restaurantId, totalPeopleAhead, _partySize, controller) => {
				controller?.abort();
				return this.computeFallbackMinutes(totalPeopleAhead);
			},
			onOpen: () => {
				logger.warn(
					{ service: 'ml-eta-service' },
					'ML ETA circuit breaker tripped to OPEN; falling back to deterministic ETA heuristic',
				);
			},
			onClose: () => {
				logger.info({ service: 'ml-eta-service' }, 'ML ETA circuit breaker recovered to CLOSED');
			},
			onHalfOpen: () => {
				logger.info(
					{ service: 'ml-eta-service' },
					'ML ETA circuit breaker entered HALF_OPEN; testing trial probe',
				);
			},
			onFallback: (_result, err) => {
				logger.warn(
					{ service: 'ml-eta-service', err },
					'ML ETA circuit breaker executed fallback heuristic',
				);
			},
			...breakerOptions,
		});
	}

	private computeFallbackMinutes(totalPeopleAhead: number): number {
		return Math.max(
			ETA_CONSTANTS.BASE_FALLBACK_MINUTES,
			Math.round(totalPeopleAhead * ETA_CONSTANTS.FALLBACK_MINUTES_PER_PERSON),
		);
	}

	private readonly callPredictionApi = async (
		restaurantId: string,
		totalPeopleAhead: number,
		partySize: number,
		controller?: AbortController,
	): Promise<number> => {
		const response = await axios.get<IMlEtaPredictionResponse>(
			`${this.baseUrl}${ML_ETA_SERVICE_ROUTES.PREDICT}`,
			{
				signal: controller?.signal,
				params: {
					restaurant_id: restaurantId,
					total_people_ahead: totalPeopleAhead,
					party_size: partySize,
				},
				timeout: this.requestTimeoutMs,
				headers: {
					Accept: 'application/json',
				},
			},
		);

		const data = response.data;

		if (
			typeof data?.estimated_wait_minutes === 'number' &&
			Number.isFinite(data.estimated_wait_minutes)
		) {
			return Math.max(0, Math.round(data.estimated_wait_minutes));
		}

		return this.computeFallbackMinutes(totalPeopleAhead);
	};

	async predictEta(
		restaurantId: string,
		totalPeopleAhead: number,
		partySize: number,
	): Promise<number> {
		const controller = new AbortController();
		try {
			return await this.breaker.execute(restaurantId, totalPeopleAhead, partySize, controller);
		} catch (error) {
			controller.abort();
			logger.warn(
				{ err: error, restaurantId },
				'ML ETA prediction failed. Returning deterministic fallback ETA.',
			);
			return this.computeFallbackMinutes(totalPeopleAhead);
		}
	}
}

export const mlEtaServiceClient = new MlEtaServiceClient();
