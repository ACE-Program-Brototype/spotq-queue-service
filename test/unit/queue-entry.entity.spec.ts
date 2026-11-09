import {
	ForbiddenTicketAccessError,
	QueueEntry,
	QueueEntryNotWaitingError,
	QueueStatus,
	RegistrationType,
	WalkInTicketNotAccessibleError,
} from '@domain/index.ts';
import { QUEUE_CONSTANTS } from '@shared/constants/queue.constants.ts';

describe('QueueEntry Entity Unit Tests', () => {
	const createTestEntry = (
		overrides: Partial<Parameters<typeof QueueEntry.reconstitute>[0]> = {},
	): QueueEntry => {
		const now = new Date();
		return QueueEntry.reconstitute({
			id: 'entry-123',
			restaurantId: 'rest-123',
			userId: overrides.userId !== undefined ? overrides.userId : 'user-123',
			guestName: 'Jane Doe',
			phone: '+15559876543',
			queueNumber: 'Q-005',
			partySize: 3,
			specialNotes: null,
			registrationType: overrides.registrationType ?? RegistrationType.ONLINE,
			position: 2,
			estimatedWaitMinutes: 15,
			estimatedWaitMinutesAtJoin: 15,
			status: overrides.status ?? QueueStatus.WAITING,
			ringCount: overrides.ringCount ?? 0,
			lastRingedAt: overrides.lastRingedAt ?? null,
			fid: null,
			joinedAt: overrides.joinedAt ?? new Date(now.getTime() - 25 * 60 * 1000), // 25 minutes ago
			seatedAt: overrides.seatedAt ?? null,
			createdAt: overrides.createdAt ?? now,
			updatedAt: overrides.updatedAt ?? now,
		});
	};

	describe('generateQueueNumber', () => {
		it('should generate Q-prefix for ONLINE registration formatted with 3 zero-padded digits', () => {
			expect(QueueEntry.generateQueueNumber(RegistrationType.ONLINE, 1)).toBe('Q-001');
			expect(QueueEntry.generateQueueNumber(RegistrationType.ONLINE, 42)).toBe('Q-042');
			expect(QueueEntry.generateQueueNumber(RegistrationType.ONLINE, 123)).toBe('Q-123');
		});

		it('should generate W-prefix for WALK_IN registration formatted with 3 zero-padded digits', () => {
			expect(QueueEntry.generateQueueNumber(RegistrationType.WALK_IN, 1)).toBe('W-001');
			expect(QueueEntry.generateQueueNumber(RegistrationType.WALK_IN, 99)).toBe('W-099');
			expect(QueueEntry.generateQueueNumber(RegistrationType.WALK_IN, 999)).toBe('W-999');
		});
	});

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

		it('should calculate wait duration using updatedAt for terminal entries (e.g. CANCELLED)', () => {
			const joinedAt = new Date('2026-10-28T10:00:00.000Z');
			const cancelledAt = new Date('2026-10-28T10:15:00.000Z');
			const laterReferenceTime = new Date('2026-10-28T18:00:00.000Z');
			const entry = createTestEntry({
				status: QueueStatus.CANCELLED,
				joinedAt,
				updatedAt: cancelledAt,
			});

			const duration = entry.calculateWaitDurationMinutes(laterReferenceTime);

			expect(duration).toBe(15);
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

	describe('updatePosition', () => {
		it('should update position and eta when entry is WAITING', () => {
			const entry = createTestEntry({ status: QueueStatus.WAITING });
			entry.updatePosition(4, 25);

			expect(entry.position).toBe(4);
			expect(entry.estimatedWaitMinutes).toBe(25);
		});

		it('should ignore position and eta updates when entry is not WAITING', () => {
			const seatedEntry = createTestEntry({ status: QueueStatus.SEATED });
			seatedEntry.updatePosition(4, 25);
			expect(seatedEntry.position).toBe(2);

			const cancelledEntry = createTestEntry({ status: QueueStatus.CANCELLED });
			cancelledEntry.updatePosition(4, 25);
			expect(cancelledEntry.position).toBe(2);
		});
	});

	describe('ensureCustomerAccessible', () => {
		it('should pass without error when user is owner and registration is ONLINE', () => {
			const entry = createTestEntry({
				userId: 'user-123',
				registrationType: RegistrationType.ONLINE,
			});
			expect(() => entry.ensureCustomerAccessible('user-123')).not.toThrow();
		});

		it('should throw WalkInTicketNotAccessibleError when entry is WALK_IN', () => {
			const entry = createTestEntry({
				userId: 'user-123',
				registrationType: RegistrationType.WALK_IN,
			});
			expect(() => entry.ensureCustomerAccessible('user-123')).toThrow(
				WalkInTicketNotAccessibleError,
			);
		});

		it('should throw ForbiddenTicketAccessError when userId does not match', () => {
			const entry = createTestEntry({ userId: 'owner-user' });
			expect(() => entry.ensureCustomerAccessible('different-user')).toThrow(
				ForbiddenTicketAccessError,
			);
		});

		it('should throw ForbiddenTicketAccessError when entry has no userId', () => {
			const entry = createTestEntry({ userId: null });
			expect(() => entry.ensureCustomerAccessible('user-123')).toThrow(ForbiddenTicketAccessError);
		});
	});

	describe('leave', () => {
		it('should cancel entry and set position to null when valid waiting online entry leaves', () => {
			const entry = createTestEntry({ status: QueueStatus.WAITING, userId: 'user-123' });
			entry.leave('user-123');

			expect(entry.status).toBe(QueueStatus.CANCELLED);
			expect(entry.position).toBeNull();
			expect(entry.cancelledAt).toBeInstanceOf(Date);
		});

		it('should throw QueueEntryNotWaitingError if entry is not WAITING', () => {
			const entry = createTestEntry({ status: QueueStatus.SEATED, userId: 'user-123' });

			expect(() => entry.leave('user-123')).toThrow(QueueEntryNotWaitingError);
		});

		it('should throw WalkInTicketNotAccessibleError if entry is WALK_IN', () => {
			const entry = createTestEntry({
				status: QueueStatus.WAITING,
				registrationType: RegistrationType.WALK_IN,
				userId: 'user-123',
			});

			expect(() => entry.leave('user-123')).toThrow(WalkInTicketNotAccessibleError);
		});

		it('should throw ForbiddenTicketAccessError if userId does not match', () => {
			const entry = createTestEntry({ status: QueueStatus.WAITING, userId: 'owner-user' });

			expect(() => entry.leave('different-user')).toThrow(ForbiddenTicketAccessError);
		});

		it('should throw ForbiddenTicketAccessError if entry has no userId', () => {
			const entry = createTestEntry({ status: QueueStatus.WAITING, userId: null });

			expect(() => entry.leave('any-user')).toThrow(ForbiddenTicketAccessError);
		});
	});
});
