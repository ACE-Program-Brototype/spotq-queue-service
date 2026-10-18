import type { IEtaService } from '@application/ports/services/eta-service.port.ts';
import { config } from '@infrastructure/config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { ML_ETA_SERVICE_ROUTES } from '@shared/constants/routes.constants.ts';
import { injectable } from 'inversify';

@injectable()
export class MlEtaServiceClient implements IEtaService {
	private readonly baseUrl: string;

	constructor(baseUrl: string = config.services.etaServiceUrl) {
		this.baseUrl = baseUrl.replace(/\/$/, '');
	}

	async predictEta(
		restaurantId: string,
		totalPeopleAhead: number,
		partySize: number,
	): Promise<number> {
		// Heuristic fallback in case ML model is cold, down, or fails:
		// Base minimum wait time of 5 minutes + approx 2.5 minutes per person ahead
		const fallbackMinutes = Math.max(5, Math.round(totalPeopleAhead * 2.5));

		try {
			const query = new URLSearchParams({
				restaurant_id: restaurantId,
				total_people_ahead: totalPeopleAhead.toString(),
				party_size: partySize.toString(),
			});

			const url = `${this.baseUrl}${ML_ETA_SERVICE_ROUTES.PREDICT(query)}`;
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					Accept: 'application/json',
				},
				signal: AbortSignal.timeout(1000), // 1s timeout
			});

			if (!response.ok) {
				logger.warn(
					{ status: response.status, restaurantId },
					'ML ETA service returned non-200. Using deterministic fallback ETA.',
				);
				return fallbackMinutes;
			}

			const data = (await response.json()) as {
				estimated_wait_minutes?: number;
			};

			if (
				typeof data.estimated_wait_minutes === 'number' &&
				!Number.isNaN(data.estimated_wait_minutes)
			) {
				return Math.max(0, Math.round(data.estimated_wait_minutes));
			}

			return fallbackMinutes;
		} catch (error) {
			logger.warn(
				{ err: error, restaurantId },
				'ML ETA service call timed out or failed. Using fallback ETA.',
			);
			return fallbackMinutes;
		}
	}
}

export const mlEtaServiceClient = new MlEtaServiceClient();
