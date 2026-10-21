import { config } from '@infrastructure/config/env.ts';
import { HTTP_STATUS } from '@shared/constants/http.constants.ts';
import { authMiddleware, type TokenVerifierConfig } from '@spotq-org/s2s-core';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function internalS2SAuthMiddleware(): RequestHandler {
	const orderKey = config.s2s.orderPublicKey;

	if (!orderKey) {
		return (_req: Request, res: Response): void => {
			res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
				success: false,
				statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
				code: 'INTERNAL_SERVER_ERROR',
				message: 'S2S authentication is misconfigured: public key for order-service is missing',
				retryable: false,
			});
		};
	}

	const publicKeys: Record<string, string> = {
		'order-service': orderKey.replace(/\\n/g, '\n').trim(),
	};

	const verifierConfig: TokenVerifierConfig = {
		expectedAudience: config.serviceName,
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
