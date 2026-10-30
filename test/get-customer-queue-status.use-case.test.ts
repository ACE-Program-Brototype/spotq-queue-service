import 'reflect-metadata';
import { GetCustomerQueueStatusUseCase } from '@application/use-cases/internal/get-customer-queue-status.use-case.ts';
import { QueueEntry, QueueStatus, RegistrationType } from '@domain/index.ts';
import type { IQueueRepository } from '@domain/repositories/queue.repository.interface.ts';

describe('GetCustomerQueueStatusUseCase', () => {
	const userId = '22222222-2222-2222-2222-222222222222';
	const restaurantId = '11111111-1111-1111-1111-111111111111';
	const queueEntryId = '33333333-3333-3333-3333-333333333333';
	let queueRepository: jest.Mocked<IQueueRepository>;
	let useCase: GetCustomerQueueStatusUseCase;

	beforeEach(() => {
		queueRepository = {
			findActiveByUserId: jest.fn(),
		} as unknown as jest.Mocked<IQueueRepository>;
		useCase = new GetCustomerQueueStatusUseCase(queueRepository);
	});

	const createQueueEntry = () =>
		QueueEntry.create({
			id: queueEntryId,
			restaurantId,
			userId,
			guestName: 'Test Customer',
			phone: '+1234567890',
			queueNumber: 'W-001',
			partySize: 2,
			position: 1,
			estimatedWaitMinutes: 15,
			registrationType: RegistrationType.ONLINE,
		});

	it('returns the active waiting queue entry details for the user', async () => {
		queueRepository.findActiveByUserId.mockResolvedValue(createQueueEntry());

		await expect(useCase.execute({ userId })).resolves.toEqual({ restaurantId, queueEntryId });
		expect(queueRepository.findActiveByUserId).toHaveBeenCalledWith(userId);
	});

	it('returns null when the repository finds no active queue entry', async () => {
		queueRepository.findActiveByUserId.mockResolvedValue(null);

		await expect(useCase.execute({ userId })).resolves.toBeNull();
		expect(queueRepository.findActiveByUserId).toHaveBeenCalledWith(userId);
	});

	it('returns null when the active queue entry is no longer waiting', async () => {
		const seatedEntry = createQueueEntry();
		seatedEntry.seat();
		queueRepository.findActiveByUserId.mockResolvedValue(seatedEntry);

		await expect(useCase.execute({ userId })).resolves.toBeNull();
		expect(seatedEntry.status).toBe(QueueStatus.SEATED);
		expect(queueRepository.findActiveByUserId).toHaveBeenCalledWith(userId);
	});
});
