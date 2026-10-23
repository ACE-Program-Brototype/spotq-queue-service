import { QueueStatus, RegistrationType } from '../enums/queue.enums.ts';
import {
	CannotRingWalkInCustomerError,
	QueueEntryNotWaitingError,
} from '../errors/queue.errors.ts';

/**
 * Immutable properties representing a QueueEntry record in the domain model.
 */
export interface QueueEntryProps {
	id: string;
	restaurantId: string;
	userId?: string | null;
	guestName: string;
	phone: string;
	queueNumber: string;
	partySize: number;
	specialNotes?: string | null;
	registrationType: RegistrationType;
	position: number | null;
	estimatedWaitMinutes: number | null;
	estimatedWaitMinutesAtJoin: number | null;
	status: QueueStatus;
	ringCount: number;
	lastRingedAt?: Date | null;
	fid?: string | null;
	joinedAt: Date;
	seatedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Parameters required to create a new queue entry (walk-in or online).
 */
export interface CreateQueueEntryProps {
	id?: string;
	restaurantId: string;
	userId?: string | null;
	guestName: string;
	phone: string;
	queueNumber: string;
	partySize: number;
	specialNotes?: string | null;
	registrationType?: RegistrationType;
	position: number;
	estimatedWaitMinutes: number;
	fid?: string | null;
}

/**
 * Parameters required to create a new walk-in queue entry.
 */
export interface CreateWalkInQueueEntryProps {
	id?: string;
	restaurantId: string;
	guestName: string;
	phone: string;
	queueNumber: string;
	partySize: number;
	specialNotes?: string | null;
	position: number;
	estimatedWaitMinutes: number;
}

/**
 * QueueEntry Domain Entity.
 *
 * Encapsulates the state and lifecycle of a party waiting in a restaurant queue.
 * Supports both online and walk-in registrations while enforcing registrationType invariants.
 */
export class QueueEntry {
	private constructor(private readonly props: QueueEntryProps) {}

	/**
	 * Factory method to instantiate a new queue entry (online or walk-in).
	 *
	 * @param props - Queue initialization properties
	 * @returns New QueueEntry instance
	 */
	public static create(props: CreateQueueEntryProps): QueueEntry {
		const now = new Date();
		return new QueueEntry({
			id: props.id ?? crypto.randomUUID(),
			restaurantId: props.restaurantId,
			userId: props.userId ?? null,
			guestName: props.guestName.trim(),
			phone: props.phone.trim(),
			queueNumber: props.queueNumber,
			partySize: props.partySize,
			specialNotes: props.specialNotes?.trim() || null,
			registrationType: props.registrationType ?? RegistrationType.WALK_IN,
			position: props.position,
			estimatedWaitMinutes: props.estimatedWaitMinutes,
			estimatedWaitMinutesAtJoin: props.estimatedWaitMinutes,
			status: QueueStatus.WAITING,
			ringCount: 0,
			lastRingedAt: null,
			fid: props.fid ?? null,
			joinedAt: now,
			seatedAt: null,
			createdAt: now,
			updatedAt: now,
		});
	}

	/**
	 * Factory method to instantiate a new walk-in queue entry.
	 *
	 * @param props - Walk-in initialization properties
	 * @returns New QueueEntry instance
	 */
	public static createWalkIn(props: CreateWalkInQueueEntryProps): QueueEntry {
		return QueueEntry.create({
			...props,
			registrationType: RegistrationType.WALK_IN,
		});
	}

	/**
	 * Reconstitutes an existing QueueEntry from persistent storage.
	 *
	 * @param props - Stored entity properties
	 * @returns QueueEntry instance
	 */
	public static reconstitute(props: QueueEntryProps): QueueEntry {
		return new QueueEntry(props);
	}

	public get id(): string {
		return this.props.id;
	}

	public get restaurantId(): string {
		return this.props.restaurantId;
	}

	public get userId(): string | null | undefined {
		return this.props.userId;
	}

	public get guestName(): string {
		return this.props.guestName;
	}

	public get phone(): string {
		return this.props.phone;
	}

	public get queueNumber(): string {
		return this.props.queueNumber;
	}

	public get partySize(): number {
		return this.props.partySize;
	}

	public get specialNotes(): string | null | undefined {
		return this.props.specialNotes;
	}

	public get registrationType(): RegistrationType {
		return this.props.registrationType;
	}

	public get position(): number | null {
		return this.props.position;
	}

	public get estimatedWaitMinutes(): number | null {
		return this.props.estimatedWaitMinutes;
	}

	public get estimatedWaitMinutesAtJoin(): number | null {
		return this.props.estimatedWaitMinutesAtJoin;
	}

	public get status(): QueueStatus {
		return this.props.status;
	}

	public get ringCount(): number {
		return this.props.ringCount;
	}

	public get lastRingedAt(): Date | null | undefined {
		return this.props.lastRingedAt;
	}

	public get fid(): string | null | undefined {
		return this.props.fid;
	}

	public get joinedAt(): Date {
		return this.props.joinedAt;
	}

	public get seatedAt(): Date | null | undefined {
		return this.props.seatedAt;
	}

	public get createdAt(): Date {
		return this.props.createdAt;
	}

	public get updatedAt(): Date {
		return this.props.updatedAt;
	}

	public seat(): void {
		if (this.props.status !== QueueStatus.WAITING) {
			throw new QueueEntryNotWaitingError(this.props.id, this.props.status);
		}
		this.props.status = QueueStatus.SEATED;
		this.props.seatedAt = new Date();
		this.props.position = null;
		this.props.updatedAt = new Date();
	}

	public ring(): void {
		if (this.props.status !== QueueStatus.WAITING) {
			throw new QueueEntryNotWaitingError(this.props.id, this.props.status);
		}
		if (this.props.registrationType === RegistrationType.WALK_IN) {
			throw new CannotRingWalkInCustomerError(this.props.id);
		}
		this.props.ringCount += 1;
		this.props.lastRingedAt = new Date();
		this.props.updatedAt = new Date();
	}

	public toJSON(): QueueEntryProps {
		return { ...this.props };
	}
}
