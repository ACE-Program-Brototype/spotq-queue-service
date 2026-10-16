import 'express';

/**
 * Staff user representation authenticated via API Gateway headers.
 */
export interface AuthenticatedUser {
	userId: string;
	restaurantId: string;
	email: string;
	role: string;
}

export type AuthenticatedStaff = AuthenticatedUser;

declare global {
	namespace Express {
		interface Request {
			user?: AuthenticatedStaff;
			userId?: string;
		}
	}
}
