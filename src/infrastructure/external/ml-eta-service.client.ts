import type { IEtaService } from '@application/ports/services/eta-service.port.ts';
import { config } from '@infrastructure/config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { ETA_CONSTANTS } from '@shared/constants/eta.constants.ts';
import { ML_ETA_SERVICE_ROUTES } from '@shared/constants/routes.constants.ts';
import axios from 'axios';
import { injectable } from 'inversify';

interface IMlEtaPredictionResponse {
	estimated_wait_minutes?: number;
}

@injectable()
export class MlEtaServiceClient implements IEtaService {
	private readonly baseUrl: string;
	private readonly timeoutMs: number;

	constructor(
		baseUrl: string = config.services.etaServiceUrl,
		timeoutMs: number = config.services.etaServiceTimeoutMs,
	) {
		this.baseUrl = baseUrl.replace(/\/$/, '');
		this.timeoutMs = timeoutMs;
	}

	async predictEta(
		restaurantId: string,
		totalPeopleAhead: number,
		partySize: number,
	): Promise<number> {
		// Heuristic fallback in case ML model is cold, down, or fails:
		const fallbackMinutes = Math.max(
			ETA_CONSTANTS.BASE_FALLBACK_MINUTES,
			Math.round(totalPeopleAhead * ETA_CONSTANTS.FALLBACK_MINUTES_PER_PERSON),
		);

		try {
			const response = await axios.get<IMlEtaPredictionResponse>(
				`${this.baseUrl}${ML_ETA_SERVICE_ROUTES.PREDICT()}`,
				{
					params: {
						restaurant_id: restaurantId,
						total_people_ahead: totalPeopleAhead,
						party_size: partySize,
					},
					timeout: this.timeoutMs,
					headers: {
						Accept: 'application/json',
					},
				},
			);

			const data = response.data;

			if (
				typeof data?.estimated_wait_minutes === 'number' &&
				!Number.isNaN(data.estimated_wait_minutes)
			) {
				return Math.max(0, Math.round(data.estimated_wait_minutes));
			}

			return fallbackMinutes;
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				logger.warn(
					{ status: error.response.status, restaurantId },
					'ML ETA service returned non-200. Using deterministic fallback ETA.',
				);
			} else {
				logger.warn(
					{ err: error, restaurantId },
					'ML ETA service call timed out or failed. Using fallback ETA.',
				);
			}
			return fallbackMinutes;
		}
	}
}

export const mlEtaServiceClient = new MlEtaServiceClient();
