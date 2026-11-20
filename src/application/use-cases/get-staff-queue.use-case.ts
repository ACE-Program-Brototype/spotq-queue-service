import type {
	GetStaffQueueInputDTO,
	GetStaffQueueOutputDTO,
	StaffLiveQueueEntryDTO,
} from '@application/dtos/get-staff-queue.dto.ts';
import type { IGetStaffQueueUseCase } from '@application/ports/use-cases/get-staff-queue.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { type IQueueRepository, QueueStatus, type StaffQueueSnapshotItem } from '@domain/index.ts';
import { PARTY_SIZE_RANGE_MAP, QUEUE_CONSTANTS } from '@shared/constants/queue.constants.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetStaffQueueUseCase implements IGetStaffQueueUseCase {
	constructor(
		@inject(TYPES.Repositories.QueueRepository)
		private readonly queueRepository: IQueueRepository,
	) {}

	async execute(input: GetStaffQueueInputDTO): Promise<GetStaffQueueOutputDTO> {
		const { restaurantId, status = QueueStatus.WAITING, partySizeBucket } = input;

		const { minPartySize, maxPartySize } = partySizeBucket
			? PARTY_SIZE_RANGE_MAP[partySizeBucket]
			: {};

		const snapshot = await this.queueRepository.getStaffQueueSnapshot(restaurantId, {
			status,
			minPartySize,
			maxPartySize,
		});

		const now = new Date();
		const entries = this.mapToLiveQueueEntries(snapshot.entries, now);

		return {
			restaurantId,
			totalWaiting: snapshot.totalWaiting,
			entries,
		};
	}

	private mapToLiveQueueEntries(
		rawEntries: StaffQueueSnapshotItem[],
		now: Date,
	): StaffLiveQueueEntryDTO[] {
		let waitingLinePosition = QUEUE_CONSTANTS.INITIAL_WAITING_POSITION;

		return rawEntries.map(({ entry, assignedTableId }) => {
			const position = entry.status === QueueStatus.WAITING ? waitingLinePosition++ : null;

			const responseDeadline = entry.calculateResponseDeadline()?.toISOString() ?? null;

			return {
				queueEntryId: entry.id,
				queueNumber: entry.queueNumber,
				position,
				guestName: entry.guestName,
				guestPhone: entry.phone,
				partySize: entry.partySize,
				specialNotes: entry.specialNotes ?? null,
				registrationType: entry.registrationType,
				status: entry.status,
				assignedTableId,
				joinedAt: entry.joinedAt.toISOString(),
				ringCount: entry.ringCount,
				lastRingAt: entry.lastRingedAt ? entry.lastRingedAt.toISOString() : null,
				responseDeadline,
				waitDurationMinutes: entry.calculateWaitDurationMinutes(now),
			};
		});
	}
}
