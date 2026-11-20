import { config } from '@infrastructure/config/env.ts';
import { SERVICES } from '@shared/constants/services.constants.ts';
import { authMiddleware, type TokenVerifierConfig } from '@spotq-org/s2s-core';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function internalS2SAuthMiddleware(): RequestHandler {
	const publicKeys: Record<string, string> = {
		...(config.s2s.orderPublicKey && {
			[SERVICES.ORDER_SERVICE]: config.s2s.orderPublicKey,
		}),
		...(config.s2s.restaurantPublicKey && {
			[SERVICES.RESTAURANT_SERVICE]: config.s2s.restaurantPublicKey,
		}),
	};

	const verifierConfig: TokenVerifierConfig = {
		expectedAudience: SERVICES.QUEUE_SERVICE,
		publicKeys,
	};

	const authenticateS2S = authMiddleware(verifierConfig);

	return (req: Request, res: Response, next: NextFunction): void => {
		if (!req.headers['x-caller-service'] && req.headers['x-consumer-service']) {
			req.headers['x-caller-service'] = req.headers['x-consumer-service'];
		}

		authenticateS2S(req, res, next);
	};
}
