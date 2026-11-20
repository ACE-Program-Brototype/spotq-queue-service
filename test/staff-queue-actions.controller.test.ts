import { UnauthorizedError } from '@domain/index.ts';
import { StaffQueueActionsController } from '@presentation/http/controllers/staff-queue-actions.controller.ts';
import { HTTP_STATUS } from '@shared/index.ts';
import type { Request, Response } from 'express';

describe('StaffQueueActionsController Unit Tests', () => {
	let controller: StaffQueueActionsController;
	let mockSeatPartyUseCase: { execute: jest.Mock };
	let mockSkipPartyUseCase: { execute: jest.Mock };
	let mockCancelQueueEntryUseCase: { execute: jest.Mock };
	let mockRes: Partial<Response>;

	beforeEach(() => {
		mockSeatPartyUseCase = { execute: jest.fn() };
		mockSkipPartyUseCase = { execute: jest.fn() };
		mockCancelQueueEntryUseCase = { execute: jest.fn() };
		controller = new StaffQueueActionsController(
			mockSeatPartyUseCase as never,
			mockSkipPartyUseCase as never,
			mockCancelQueueEntryUseCase as never,
		);

		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		};
	});

	it('should seat party successfully and return 200', async () => {
		mockSeatPartyUseCase.execute.mockResolvedValue({
			queueEntryId: 'entry-1',
			status: 'SEATED',
		});

		const req = {
			params: { restaurantId: 'rest-1', queueEntryId: 'entry-1' },
			body: { tableIds: ['tbl-1'] },
			user: { userId: 'staff-1' },
		} as unknown as Request;

		await controller.seatParty(req, mockRes as Response);

		expect(mockSeatPartyUseCase.execute).toHaveBeenCalledWith({
			restaurantId: 'rest-1',
			queueEntryId: 'entry-1',
			staffUserId: 'staff-1',
			tableIds: ['tbl-1'],
		});
		expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
	});

	it('should fallback to req.userId when req.user is absent', async () => {
		mockSeatPartyUseCase.execute.mockResolvedValue({
			queueEntryId: 'entry-1',
			status: 'SEATED',
		});

		const req = {
			params: { restaurantId: 'rest-1', queueEntryId: 'entry-1' },
			body: { tableIds: ['tbl-1'] },
			userId: 'staff-from-root-req',
		} as unknown as Request;

		await controller.seatParty(req, mockRes as Response);

		expect(mockSeatPartyUseCase.execute).toHaveBeenCalledWith({
			restaurantId: 'rest-1',
			queueEntryId: 'entry-1',
			staffUserId: 'staff-from-root-req',
			tableIds: ['tbl-1'],
		});
		expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
	});

	it('should throw UnauthorizedError when staffUserId is missing in seatParty', async () => {
		const req = {
			params: { restaurantId: 'rest-1', queueEntryId: 'entry-1' },
			body: { tableIds: ['tbl-1'] },
			user: undefined,
		} as unknown as Request;

		await expect(controller.seatParty(req, mockRes as Response)).rejects.toThrow(UnauthorizedError);
	});

	it('should skip party successfully and return 200', async () => {
		mockSkipPartyUseCase.execute.mockResolvedValue({
			queueEntryId: 'entry-1',
			status: 'SKIPPED',
		});

		const req = {
			params: { restaurantId: 'rest-1', queueEntryId: 'entry-1' },
			body: { reason: 'No answer', skipPositions: 2 },
			user: { userId: 'staff-1' },
		} as unknown as Request;

		await controller.skipParty(req, mockRes as Response);

		expect(mockSkipPartyUseCase.execute).toHaveBeenCalledWith({
			restaurantId: 'rest-1',
			queueEntryId: 'entry-1',
			staffUserId: 'staff-1',
			reason: 'No answer',
			skipPositions: 2,
		});
		expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
	});

	it('should throw UnauthorizedError when staffUserId is missing in skipParty', async () => {
		const req = {
			params: { restaurantId: 'rest-1', queueEntryId: 'entry-1' },
			body: { reason: 'No answer' },
			user: undefined,
		} as unknown as Request;

		await expect(controller.skipParty(req, mockRes as Response)).rejects.toThrow(UnauthorizedError);
	});

	it('should cancel queue entry successfully and return 200', async () => {
		mockCancelQueueEntryUseCase.execute.mockResolvedValue({
			queueEntryId: 'entry-1',
			status: 'CANCELLED',
		});

		const req = {
			params: { restaurantId: 'rest-1', queueEntryId: 'entry-1' },
			body: { reason: 'GUEST_CANCELLED', notes: 'Changed mind' },
			user: { userId: 'staff-1' },
		} as unknown as Request;

		await controller.cancelQueueEntry(req, mockRes as Response);

		expect(mockCancelQueueEntryUseCase.execute).toHaveBeenCalledWith({
			restaurantId: 'rest-1',
			queueEntryId: 'entry-1',
			staffUserId: 'staff-1',
			reason: 'GUEST_CANCELLED',
			notes: 'Changed mind',
		});
		expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
	});

	it('should throw UnauthorizedError when staffUserId is missing in cancelQueueEntry', async () => {
		const req = {
			params: { restaurantId: 'rest-1', queueEntryId: 'entry-1' },
			body: { reason: 'GUEST_CANCELLED' },
			user: undefined,
		} as unknown as Request;

		await expect(controller.cancelQueueEntry(req, mockRes as Response)).rejects.toThrow(
			UnauthorizedError,
		);
	});
});
