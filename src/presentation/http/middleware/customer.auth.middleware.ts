import type { NextFunction, Request, Response } from 'express';
import { ERROR_CODES } from '@/shared/constants/error-code.constants.ts';
import { HTTP_STATUS } from '@/shared/constants/http.constants.ts';
import { messages } from '@/shared/constants/message.constants.ts';
import { ApiResponse } from '@/shared/response/api-response.ts';
import { getHeaderValue } from './middleware.utils.ts';

export function customerAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
	const userId = getHeaderValue(req.headers['x-user-id']);

	if (!userId) {
		res
			.status(HTTP_STATUS.UNAUTHORIZED)
			.json(
				ApiResponse.error(
					messages.GATEWAY_UNAUTHORIZED,
					ERROR_CODES.UNAUTHORIZED,
					HTTP_STATUS.UNAUTHORIZED,
				),
			);
		return;
	}

	const role = getHeaderValue(req.headers['x-user-role']) || 'CUSTOMER';
	const email = getHeaderValue(req.headers['x-user-email']) || '';

	req.user = {
		userId,
		email,
		role: role.toUpperCase(),
	};
	req.userId = userId;

	next();
}
