import { config } from '@infrastructure/config/env.ts';
import { internalS2SAuthMiddleware } from '@presentation/http/middleware/internal-s2s-auth.middleware.ts';
import { HTTP_STATUS } from '@shared/constants/http.constants.ts';
import type { NextFunction, Request, Response } from 'express';

jest.mock('@spotq-org/s2s-core', () => ({
	authMiddleware: jest.fn(() => (req: Request, _res: Response, next: NextFunction): void => {
		(req as unknown as { authenticated: boolean }).authenticated = true;
		next();
	}),
}));

describe('internalS2SAuthMiddleware', () => {
	const originalOrderKey = config.s2s.orderPublicKey;

	afterEach(() => {
		// biome-ignore lint/suspicious/noExplicitAny: test cleanup of readonly config
		(config.s2s as any).orderPublicKey = originalOrderKey;
		jest.clearAllMocks();
	});

	it('should fail closed with 500 if orderPublicKey is not configured', () => {
		// biome-ignore lint/suspicious/noExplicitAny: simulate missing config
		(config.s2s as any).orderPublicKey = '';

		const middleware = internalS2SAuthMiddleware();
		const req = {} as Request;
		const jsonMock = jest.fn();
		const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
		const res = { status: statusMock } as unknown as Response;
		const next = jest.fn();

		middleware(req, res, next);

		expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
		expect(jsonMock).toHaveBeenCalledWith(
			expect.objectContaining({
				success: false,
				statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
				code: 'INTERNAL_SERVER_ERROR',
				retryable: false,
			}),
		);
		expect(next).not.toHaveBeenCalled();
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
