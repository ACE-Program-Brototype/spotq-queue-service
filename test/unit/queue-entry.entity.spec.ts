import { QueueEntry, QueueStatus, RegistrationType } from '@domain/index.ts';
import { QUEUE_CONSTANTS } from '@shared/constants/queue.constants.ts';

describe('QueueEntry Entity Unit Tests', () => {
	const createTestEntry = (
		overrides: Partial<Parameters<typeof QueueEntry.reconstitute>[0]> = {},
	): QueueEntry => {
		const now = new Date();
		return QueueEntry.reconstitute({
			id: 'entry-123',
			restaurantId: 'rest-123',
			userId: 'user-123',
			guestName: 'Jane Doe',
			phone: '+15559876543',
			queueNumber: 'Q-005',
			partySize: 3,
			specialNotes: null,
			registrationType: RegistrationType.ONLINE,
			position: 2,
			estimatedWaitMinutes: 15,
			estimatedWaitMinutesAtJoin: 15,
			status: overrides.status ?? QueueStatus.WAITING,
			ringCount: overrides.ringCount ?? 0,
			lastRingedAt: overrides.lastRingedAt ?? null,
			fid: null,
			joinedAt: overrides.joinedAt ?? new Date(now.getTime() - 25 * 60 * 1000), // 25 minutes ago
			seatedAt: overrides.seatedAt ?? null,
			createdAt: now,
			updatedAt: now,
		});
	};

	describe('calculateWaitDurationMinutes', () => {
		it('should calculate elapsed wait time from joinedAt to referenceTime when WAITING', () => {
			const joinedAt = new Date('2026-10-28T10:00:00.000Z');
			const referenceTime = new Date('2026-10-28T10:45:30.000Z');
			const entry = createTestEntry({ status: QueueStatus.WAITING, joinedAt });

			const duration = entry.calculateWaitDurationMinutes(referenceTime);

			expect(duration).toBe(45);
		});

		it('should calculate wait duration between joinedAt and seatedAt when status is SEATED', () => {
			const joinedAt = new Date('2026-10-28T10:00:00.000Z');
			const seatedAt = new Date('2026-10-28T10:20:00.000Z');
			const laterReferenceTime = new Date('2026-10-28T11:00:00.000Z');
			const entry = createTestEntry({
				status: QueueStatus.SEATED,
				joinedAt,
				seatedAt,
			});

			const duration = entry.calculateWaitDurationMinutes(laterReferenceTime);

			expect(duration).toBe(20);
		});

		it('should return 0 when referenceTime is before joinedAt', () => {
			const joinedAt = new Date('2026-10-28T10:00:00.000Z');
			const earlierTime = new Date('2026-10-28T09:55:00.000Z');
			const entry = createTestEntry({ status: QueueStatus.WAITING, joinedAt });

			const duration = entry.calculateWaitDurationMinutes(earlierTime);

			expect(duration).toBe(0);
		});
	});

	describe('calculateResponseDeadline', () => {
		it('should return null if entry has never been rung', () => {
			const entry = createTestEntry({ lastRingedAt: null });

			expect(entry.calculateResponseDeadline()).toBeNull();
		});

		it('should return lastRingedAt plus DEFAULT_RESPONSE_TIMEOUT_MS when rung', () => {
			const lastRingedAt = new Date('2026-10-28T10:00:00.000Z');
			const entry = createTestEntry({ lastRingedAt, ringCount: 1 });

			const deadline = entry.calculateResponseDeadline();

			expect(deadline).toEqual(
				new Date(lastRingedAt.getTime() + QUEUE_CONSTANTS.DEFAULT_RESPONSE_TIMEOUT_MS),
			);
		});

		it('should accept custom timeout duration', () => {
			const lastRingedAt = new Date('2026-10-28T10:00:00.000Z');
			const entry = createTestEntry({ lastRingedAt, ringCount: 1 });

			const customDeadline = entry.calculateResponseDeadline(60 * 1000);

			expect(customDeadline).toEqual(new Date('2026-10-28T10:01:00.000Z'));
		});
	});
});
