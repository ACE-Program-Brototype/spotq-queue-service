import type { IHealthService } from '@domain/index.ts';
import { HEALTH_STATUS, HTTP_STATUS } from '@shared/constants/index.ts';
import type { Request, Response } from 'express';

export class HealthController {
	private readonly healthService: IHealthService;

	constructor(healthService: IHealthService) {
		this.healthService = healthService;
	}

	check = async (_req: Request, res: Response): Promise<void> => {
		const result = await this.healthService.check();
		const statusCode =
			result.status === HEALTH_STATUS.UP ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
		res.status(statusCode).json(result);
	};
}
