import { QueueEntry, type QueueStatus, type RegistrationType } from '@domain/index.ts';
import type { QueueEntry as PrismaQueueEntry } from '@prisma/client';

export interface IEntityMapper<TDomain, TPersistence> {
	toDomain(raw: TPersistence): TDomain;
	toPersistence(entity: TDomain): TPersistence;
}

export const QueueEntryMapper: IEntityMapper<QueueEntry, PrismaQueueEntry> = {
	toDomain(raw: PrismaQueueEntry): QueueEntry {
		return QueueEntry.reconstitute({
			id: raw.id,
			restaurantId: raw.restaurantId,
			userId: raw.userId,
			guestName: raw.guestName,
			phone: raw.phone,
			queueNumber: raw.queueNumber,
			partySize: raw.partySize,
			specialNotes: raw.specialNotes ?? null,
			registrationType: raw.registrationType as RegistrationType,
			position: raw.position,
			estimatedWaitMinutes: raw.estimatedWaitMinutes,
			estimatedWaitMinutesAtJoin: raw.estimatedWaitMinutesAtJoin,
			status: raw.status as QueueStatus,
			ringCount: raw.ringCount,
			fid: raw.fid ?? null,
			joinedAt: raw.joinedAt,
			seatedAt: raw.seatedAt,
			createdAt: raw.createdAt,
			updatedAt: raw.updatedAt,
		});
	},

	toPersistence(entity: QueueEntry): PrismaQueueEntry {
		return {
			id: entity.id,
			restaurantId: entity.restaurantId,
			userId: entity.userId ?? null,
			guestName: entity.guestName,
			phone: entity.phone,
			queueNumber: entity.queueNumber,
			partySize: entity.partySize,
			specialNotes: entity.specialNotes ?? null,
			registrationType: entity.registrationType,
			position: entity.position,
			estimatedWaitMinutes: entity.estimatedWaitMinutes,
			estimatedWaitMinutesAtJoin: entity.estimatedWaitMinutesAtJoin,
			status: entity.status,
			ringCount: entity.ringCount,
			fid: entity.fid ?? null,
			joinedAt: entity.joinedAt,
			seatedAt: entity.seatedAt ?? null,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	},
};
