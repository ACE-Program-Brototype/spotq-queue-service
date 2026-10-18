import type { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '@/shared/constants/http.constants.ts';
import { messages } from '@/shared/constants/message.constants.ts';
import { ApiResponse } from '@/shared/response/api-response.ts';
import type { AuthenticatedUser } from '@/types/express.d.ts';

export interface AuthenticatedCustomerRequest extends Request {
	user?: AuthenticatedUser;
	userId?: string;
}

function getHeaderValue(header: string | string[] | undefined): string | undefined {
	if (Array.isArray(header)) {
		return header[0];
	}
	return header;
}

export function customerAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
	const userId = getHeaderValue(req.headers['x-user-id']);

	if (!userId) {
		res
			.status(HTTP_STATUS.UNAUTHORIZED)
			.json(
				ApiResponse.error(messages.GATEWAY_UNAUTHORIZED, 'UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED),
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
