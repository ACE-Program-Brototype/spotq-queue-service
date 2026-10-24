import { UnauthorizedError } from '@domain/index.ts';
import { StaffQueueController } from '@presentation/http/controllers/staff-queue.controller.ts';
import { HTTP_STATUS, mapDomainErrorToHttpStatus, messages } from '@shared/index.ts';
import type { Request, Response } from 'express';

describe('StaffQueueController Unit Tests', () => {
	let controller: StaffQueueController;
	let mockRegisterQueueUseCase: { execute: jest.Mock };
	let mockAssignTableUseCase: { execute: jest.Mock };
	let mockRingCustomerUseCase: { execute: jest.Mock };
	let mockRes: Partial<Response>;

	beforeEach(() => {
		mockRegisterQueueUseCase = { execute: jest.fn() };
		mockAssignTableUseCase = { execute: jest.fn() };
		mockRingCustomerUseCase = { execute: jest.fn() };
		controller = new StaffQueueController(
			mockRegisterQueueUseCase as never,
			mockAssignTableUseCase as never,
			mockRingCustomerUseCase as never,
		);

		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		};
	});

	describe('UnauthorizedError & domain-error-mapper', () => {
		it('should create UnauthorizedError with default gateway unauthorized message and code', () => {
			const error = new UnauthorizedError();
			expect(error.code).toBe('UNAUTHORIZED');
			expect(error.message).toBe(messages.GATEWAY_UNAUTHORIZED);
		});

		it('should map UNAUTHORIZED to 401 HTTP status', () => {
			const error = new UnauthorizedError();
			expect(mapDomainErrorToHttpStatus(error)).toBe(HTTP_STATUS.UNAUTHORIZED);
		});
	});

	describe('assignTables', () => {
		it('should throw UnauthorizedError when req.user is undefined', async () => {
			const req = {
				params: { queueEntryId: 'entry-123' },
				body: { tables: [{ tableId: 't-1', tableName: 'T1', count: 4 }] },
			} as unknown as Request;

			await expect(controller.assignTables(req, mockRes as Response)).rejects.toThrow(
				UnauthorizedError,
			);
		});

		it('should throw UnauthorizedError when restaurantId is missing', async () => {
			const req = {
				params: { queueEntryId: 'entry-123' },
				body: { tables: [{ tableId: 't-1', tableName: 'T1', count: 4 }] },
				user: { userId: 'staff-1' },
			} as unknown as Request;

			await expect(controller.assignTables(req, mockRes as Response)).rejects.toThrow(
				UnauthorizedError,
			);
		});

		it('should throw UnauthorizedError when staffUserId is missing', async () => {
			const req = {
				params: { queueEntryId: 'entry-123' },
				body: { tables: [{ tableId: 't-1', tableName: 'T1', count: 4 }] },
				user: { restaurantId: 'rest-1' },
			} as unknown as Request;

			await expect(controller.assignTables(req, mockRes as Response)).rejects.toThrow(
				UnauthorizedError,
			);
		});

		it('should call assignTableUseCase and return 200 on valid credentials', async () => {
			const req = {
				params: { queueEntryId: 'entry-123' },
				body: { tables: [{ tableId: 't-1', tableName: 'T1', count: 4 }] },
				user: { restaurantId: 'rest-1', userId: 'staff-1' },
			} as unknown as Request;

			const mockResult = { id: 'entry-123', status: 'SEATED' };
			mockAssignTableUseCase.execute.mockResolvedValue(mockResult);

			await controller.assignTables(req, mockRes as Response);

			expect(mockAssignTableUseCase.execute).toHaveBeenCalledWith({
				restaurantId: 'rest-1',
				queueEntryId: 'entry-123',
				staffUserId: 'staff-1',
				tables: [{ tableId: 't-1', tableName: 'T1', count: 4 }],
			});
			expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
		});
	});

	describe('ringCustomer', () => {
		it('should throw UnauthorizedError when req.user is undefined', async () => {
			const req = {
				params: { queueEntryId: 'entry-123' },
			} as unknown as Request;

			await expect(controller.ringCustomer(req, mockRes as Response)).rejects.toThrow(
				UnauthorizedError,
			);
		});

		it('should throw UnauthorizedError when restaurantId is missing', async () => {
			const req = {
				params: { queueEntryId: 'entry-123' },
				user: { userId: 'staff-1' },
			} as unknown as Request;

			await expect(controller.ringCustomer(req, mockRes as Response)).rejects.toThrow(
				UnauthorizedError,
			);
		});

		it('should throw UnauthorizedError when staffUserId is missing', async () => {
			const req = {
				params: { queueEntryId: 'entry-123' },
				user: { restaurantId: 'rest-1' },
			} as unknown as Request;

			await expect(controller.ringCustomer(req, mockRes as Response)).rejects.toThrow(
				UnauthorizedError,
			);
		});

		it('should call ringCustomerUseCase and return 200 on valid credentials', async () => {
			const req = {
				params: { queueEntryId: 'entry-123' },
				user: { restaurantId: 'rest-1', userId: 'staff-1' },
			} as unknown as Request;

			const mockResult = { id: 'entry-123', ringCount: 1 };
			mockRingCustomerUseCase.execute.mockResolvedValue(mockResult);

			await controller.ringCustomer(req, mockRes as Response);

			expect(mockRingCustomerUseCase.execute).toHaveBeenCalledWith({
				restaurantId: 'rest-1',
				queueEntryId: 'entry-123',
				staffUserId: 'staff-1',
			});
			expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
		});
	});
});
