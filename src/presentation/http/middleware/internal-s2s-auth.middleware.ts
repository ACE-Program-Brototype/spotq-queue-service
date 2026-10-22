import { config } from '@infrastructure/config/env.ts';
import { ERROR_CODES } from '@shared/constants/error-code.constants.ts';
import { HTTP_STATUS } from '@shared/constants/http.constants.ts';
import { AUTH_MESSAGES } from '@shared/constants/message.constants.ts';
import { SERVICES } from '@shared/constants/services.constants.ts';
import { authMiddleware, type TokenVerifierConfig } from '@spotq-org/s2s-core';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

const ESCAPED_NEWLINE_REGEX = /\\n/g;

export function internalS2SAuthMiddleware(): RequestHandler {
	const orderKey = config.s2s.orderPublicKey;

	if (!orderKey) {
		return (_req: Request, res: Response): void => {
			res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
				success: false,
				statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
				code: ERROR_CODES.INTERNAL_SERVER_ERROR,
				message: AUTH_MESSAGES.S2S_ORDER_KEY_MISSING,
				retryable: false,
			});
		};
	}

	const publicKeys: Record<string, string> = {
		[SERVICES.ORDER_SERVICE]: orderKey.replace(ESCAPED_NEWLINE_REGEX, '\n').trim(),
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
