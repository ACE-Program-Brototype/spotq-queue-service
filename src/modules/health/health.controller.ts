import type { Request, Response } from 'express';
import type { HealthService } from './health.service.js';

export class HealthController {
	private readonly healthService: HealthService;

	constructor(healthService: HealthService) {
		this.healthService = healthService;
	}

	check = async (_req: Request, res: Response): Promise<void> => {
		const result = await this.healthService.check();
		const statusCode = result.status === 'UP' ? 200 : 503;
		res.status(statusCode).json(result);
	};
}
