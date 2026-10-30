import { config } from '@infrastructure/config/env.ts';
import { internalS2SAuthMiddleware } from '@presentation/http/middleware/internal-s2s-auth.middleware.ts';
import { SERVICES } from '@shared/constants/services.constants.ts';
import { authMiddleware } from '@spotq-org/s2s-core';
import type { NextFunction, Request, Response } from 'express';

jest.mock('@spotq-org/s2s-core', () => ({
	authMiddleware: jest.fn(() => (req: Request, _res: Response, next: NextFunction): void => {
		(req as unknown as { authenticated: boolean }).authenticated = true;
		next();
	}),
}));

describe('internalS2SAuthMiddleware', () => {
	const originalOrderKey = config.s2s.orderPublicKey;
	const originalRestaurantKey = config.s2s.restaurantPublicKey;

	afterEach(() => {
		// biome-ignore lint/suspicious/noExplicitAny: test cleanup of readonly config
		(config.s2s as any).orderPublicKey = originalOrderKey;
		// biome-ignore lint/suspicious/noExplicitAny: test cleanup of readonly config
		(config.s2s as any).restaurantPublicKey = originalRestaurantKey;
		jest.clearAllMocks();
	});

	it('should configure s2s-core with public keys for both caller services and the queue audience', () => {
		const orderPublicKey = 'order-test-public-key';
		const restaurantPublicKey = 'restaurant-test-public-key';
		// biome-ignore lint/suspicious/noExplicitAny: set test public keys
		(config.s2s as any).orderPublicKey = orderPublicKey;
		// biome-ignore lint/suspicious/noExplicitAny: set test public keys
		(config.s2s as any).restaurantPublicKey = restaurantPublicKey;

		internalS2SAuthMiddleware();

		expect(authMiddleware).toHaveBeenCalledWith({
			expectedAudience: SERVICES.QUEUE_SERVICE,
			publicKeys: {
				[SERVICES.ORDER_SERVICE]: orderPublicKey,
				[SERVICES.RESTAURANT_SERVICE]: restaurantPublicKey,
			},
		});
	});

	it('should copy x-consumer-service to x-caller-service header and delegate to s2s-core when key is configured', () => {
		// biome-ignore lint/suspicious/noExplicitAny: set mock public key
		(config.s2s as any).orderPublicKey =
			'-----BEGIN PUBLIC KEY-----\nMOCK\n-----END PUBLIC KEY-----';

		const middleware = internalS2SAuthMiddleware();
		const req = {
			headers: {
				'x-consumer-service': 'order-service',
			},
		} as unknown as Request;
		const res = {} as Response;
		const next = jest.fn();

		middleware(req, res, next);

		expect(req.headers['x-caller-service']).toBe('order-service');
		expect(next).toHaveBeenCalled();
	});
});
