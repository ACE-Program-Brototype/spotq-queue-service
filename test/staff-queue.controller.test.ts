import { UnauthorizedError } from '@domain/index.ts';
import { StaffQueueController } from '@presentation/http/controllers/staff-queue.controller.ts';
import { HTTP_STATUS, mapDomainErrorToHttpStatus, messages } from '@shared/index.ts';
import type { Request, Response } from 'express';

describe('StaffQueueController Unit Tests', () => {
	let controller: StaffQueueController;
	let mockRegisterQueueUseCase: { execute: jest.Mock };
	let mockAssignTableUseCase: { execute: jest.Mock };
	let mockRingCustomerUseCase: { execute: jest.Mock };
	let mockGetStaffQueueUseCase: { execute: jest.Mock };
	let mockSeatPartyUseCase: { execute: jest.Mock };
	let mockSkipPartyUseCase: { execute: jest.Mock };
	let mockCancelQueueEntryUseCase: { execute: jest.Mock };
	let mockRes: Partial<Response>;

	beforeEach(() => {
		mockRegisterQueueUseCase = { execute: jest.fn() };
		mockAssignTableUseCase = { execute: jest.fn() };
		mockRingCustomerUseCase = { execute: jest.fn() };
		mockGetStaffQueueUseCase = { execute: jest.fn() };
		mockSeatPartyUseCase = { execute: jest.fn() };
		mockSkipPartyUseCase = { execute: jest.fn() };
		mockCancelQueueEntryUseCase = { execute: jest.fn() };
		controller = new StaffQueueController(
			mockRegisterQueueUseCase as never,
			mockAssignTableUseCase as never,
			mockRingCustomerUseCase as never,
			mockGetStaffQueueUseCase as never,
			mockSeatPartyUseCase as never,
			mockSkipPartyUseCase as never,
			mockCancelQueueEntryUseCase as never,
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
				userId: 'staff-1',
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
				userId: 'staff-1',
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
				userId: 'staff-1',
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
				userId: 'staff-1',
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

	describe('getLiveQueue', () => {
		it('should call getStaffQueueUseCase and return 200 with queue data', async () => {
			const req = {
				params: { restaurantId: '11111111-1111-1111-1111-111111111111' },
				query: { status: 'WAITING', partySizeBucket: 'small' },
			} as unknown as Request;

			const mockResult = {
				restaurantId: '11111111-1111-1111-1111-111111111111',
				totalWaiting: 1,
				entries: [],
			};
			mockGetStaffQueueUseCase.execute.mockResolvedValue(mockResult);

			await controller.getLiveQueue(req, mockRes as Response);

			expect(mockGetStaffQueueUseCase.execute).toHaveBeenCalledWith({
				restaurantId: '11111111-1111-1111-1111-111111111111',
				status: 'WAITING',
				partySizeBucket: 'small',
			});
			expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					data: mockResult,
				}),
			);
		});
	});

	describe('seatParty', () => {
		it('should throw UnauthorizedError when staffUserId is missing', async () => {
			const req = {
				params: { restaurantId: 'rest-1', queueEntryId: 'entry-1' },
				body: { tableIds: ['tbl-1'] },
				user: {},
			} as unknown as Request;

			await expect(controller.seatParty(req, mockRes as Response)).rejects.toThrow(
				UnauthorizedError,
			);
		});

		it('should call seatPartyUseCase and return 200 on success', async () => {
			const req = {
				params: { restaurantId: 'rest-1', queueEntryId: 'entry-1' },
				body: { tableIds: ['tbl-1'] },
				user: { userId: 'staff-1', restaurantId: 'rest-1' },
			} as unknown as Request;

			const mockResult = { queueEntryId: 'entry-1', status: 'SEATED' };
			mockSeatPartyUseCase.execute.mockResolvedValue(mockResult);

			await controller.seatParty(req, mockRes as Response);

			expect(mockSeatPartyUseCase.execute).toHaveBeenCalledWith({
				restaurantId: 'rest-1',
				queueEntryId: 'entry-1',
				staffUserId: 'staff-1',
				tableIds: ['tbl-1'],
			});
			expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
		});
	});

	describe('skipParty', () => {
		it('should throw UnauthorizedError when staffUserId is missing', async () => {
			const req = {
				params: { restaurantId: 'rest-1', queueEntryId: 'entry-1' },
				body: { reason: 'No show at stand' },
				user: {},
			} as unknown as Request;

			await expect(controller.skipParty(req, mockRes as Response)).rejects.toThrow(
				UnauthorizedError,
			);
		});

		it('should call skipPartyUseCase and return 200 on success', async () => {
			const req = {
				params: { restaurantId: 'rest-1', queueEntryId: 'entry-1' },
				body: { reason: 'No show at stand', skipPositions: 2 },
				user: { userId: 'staff-1', restaurantId: 'rest-1' },
			} as unknown as Request;

			const mockResult = { queueEntryId: 'entry-1', status: 'SKIPPED' };
			mockSkipPartyUseCase.execute.mockResolvedValue(mockResult);

			await controller.skipParty(req, mockRes as Response);

			expect(mockSkipPartyUseCase.execute).toHaveBeenCalledWith({
				restaurantId: 'rest-1',
				queueEntryId: 'entry-1',
				staffUserId: 'staff-1',
				reason: 'No show at stand',
				skipPositions: 2,
			});
			expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
		});
	});

	describe('cancelQueueEntry', () => {
		it('should throw UnauthorizedError when staffUserId is missing', async () => {
			const req = {
				params: { restaurantId: 'rest-1', queueEntryId: 'entry-1' },
				body: { reason: 'NO_SHOW' },
				user: {},
			} as unknown as Request;

			await expect(controller.cancelQueueEntry(req, mockRes as Response)).rejects.toThrow(
				UnauthorizedError,
			);
		});

		it('should call cancelQueueEntryUseCase and return 200 with appropriate message', async () => {
			const req = {
				params: { restaurantId: 'rest-1', queueEntryId: 'entry-1' },
				body: { reason: 'NO_SHOW', notes: 'Did not respond' },
				user: { userId: 'staff-1', restaurantId: 'rest-1' },
			} as unknown as Request;

			const mockResult = { queueEntryId: 'entry-1', status: 'NO_SHOW' };
			mockCancelQueueEntryUseCase.execute.mockResolvedValue(mockResult);

			await controller.cancelQueueEntry(req, mockRes as Response);

			expect(mockCancelQueueEntryUseCase.execute).toHaveBeenCalledWith({
				restaurantId: 'rest-1',
				queueEntryId: 'entry-1',
				staffUserId: 'staff-1',
				reason: 'NO_SHOW',
				notes: 'Did not respond',
			});
			expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
		});
	});
});
