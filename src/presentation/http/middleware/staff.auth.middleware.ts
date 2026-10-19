import type { NextFunction, Request, Response } from 'express';
import { ERROR_CODES } from '@/shared/constants/error-code.constants.ts';
import { HTTP_STATUS } from '@/shared/constants/http.constants.ts';
import { messages } from '@/shared/constants/message.constants.ts';
import { ApiResponse } from '@/shared/response/api-response.ts';
import type { AuthenticatedStaff } from '@/types/express.d.ts';

export type { AuthenticatedStaff };

export interface AuthenticatedRequest extends Request {
	user?: AuthenticatedStaff;
	userId?: string;
}

/**
 * Extracts a normalized single string value from a potential array of header values.
 */
function getHeaderValue(header: string | string[] | undefined): string | undefined {
	if (Array.isArray(header)) {
		return header[0];
	}
	return header;
}

/**
 * Staff authentication middleware.
 *
 * Trust boundary: JWT decoding and signature verification occur upstream at the API Gateway.
 * This middleware inspects the forwarded identity headers ('x-user-id', 'x-user-role',
 * 'x-restaurant-id', 'x-user-email') and enforces staff role membership and restaurant scoping.
 */
export function staffAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
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

	const role = getHeaderValue(req.headers['x-user-role']);
	const normalizedRole = role?.toLowerCase();

	if (normalizedRole !== 'staff' && normalizedRole !== 'admin') {
		res
			.status(HTTP_STATUS.FORBIDDEN)
			.json(
				ApiResponse.error(messages.STAFF_FORBIDDEN, ERROR_CODES.FORBIDDEN, HTTP_STATUS.FORBIDDEN),
			);
		return;
	}

	const email = getHeaderValue(req.headers['x-user-email']);
	const restaurantId = getHeaderValue(req.headers['x-restaurant-id'])?.trim();

	const paramRestaurantId = getHeaderValue(req.params?.restaurantId)?.trim();

	/*
	 * Non-admin staff members must possess a valid restaurant context header
	 * and are strictly restricted to accessing their assigned restaurant.
	 */
	if (!restaurantId || (paramRestaurantId && paramRestaurantId !== restaurantId)) {
		res
			.status(HTTP_STATUS.FORBIDDEN)
			.json(
				ApiResponse.error(
					messages.RESTAURANT_ACCESS_FORBIDDEN,
					ERROR_CODES.FORBIDDEN,
					HTTP_STATUS.FORBIDDEN,
				),
			);
		return;
	}

	req.user = {
		userId,
		restaurantId: restaurantId || '',
		email: email || '',
		role: role || 'STAFF',
	};
	req.userId = userId;

	next();
}

export const authMiddleware = staffAuthMiddleware;
