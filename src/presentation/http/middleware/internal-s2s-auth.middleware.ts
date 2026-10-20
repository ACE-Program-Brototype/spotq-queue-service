import { config } from '@infrastructure/config/env.ts';
import { authMiddleware, type TokenVerifierConfig } from '@spotq-org/s2s-core';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function internalS2SAuthMiddleware(): RequestHandler {
	const orderKey =
		process.env.S2S_ORDER_PUBLIC ||
		config.s2s.orderPublicKey ||
		process.env.ORDER_S2S_PUBLIC_KEY ||
		process.env.ORDER_SERVICE_PUBLIC_KEY;
	const publicKeys: Record<string, string> = {
		...(orderKey && {
			'order-service': orderKey.replace(/\\n/g, '\n').trim(),
		}),
	};

	if (Object.keys(publicKeys).length === 0) {
		return (_req: Request, _res: Response, next: NextFunction): void => {
			next();
		};
	}

	const verifierConfig: TokenVerifierConfig = {
		expectedAudience: process.env.S2S_AUDIENCE || config.serviceName,
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
