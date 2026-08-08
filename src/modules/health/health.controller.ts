import type { Request, Response } from 'express';
import { HEALTH_STATUS, HTTP_STATUS } from '../../shared/constants/index.js';
import type { HealthService } from './health.service.js';

export class HealthController {
	private readonly healthService: HealthService;

	constructor(healthService: HealthService) {
		this.healthService = healthService;
	}

	check = async (_req: Request, res: Response): Promise<void> => {
		const result = await this.healthService.check();
		const statusCode =
			result.status === HEALTH_STATUS.UP ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
		res.status(statusCode).json(result);
	};
}
