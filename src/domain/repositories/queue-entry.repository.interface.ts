import type {
	QueueEntry,
	QueueStatus,
	QueueStatusHistory,
	RegistrationType,
	TableAssignment,
} from '@prisma/client';

export interface CreateQueueEntryParams {
	restaurantId: string;
	userId?: string | null;
	guestName: string;
	phone: string;
	queueNumber: string;
	partySize: number;
	registrationType: RegistrationType;
	position?: number | null;
	estimatedWaitMinutes?: number | null;
	estimatedWaitMinutesAtJoin?: number | null;
	changedBy?: string | null;
}

export interface UpdateQueueStatusParams {
	id: string;
	status: QueueStatus;
	changedBy?: string | null;
	seatedAt?: Date | null;
	incrementRingCount?: boolean;
}

export interface AssignTableItem {
	tableId: string;
	assignedBy: string;
}

export interface AssignTablesParams {
	queueEntryId: string;
	tables: AssignTableItem[];
}

export interface QueueEntryWithDetails extends QueueEntry {
	tableAssignments: TableAssignment[];
	statusHistory: QueueStatusHistory[];
}

export interface IQueueEntryRepository {
	create(data: CreateQueueEntryParams): Promise<QueueEntryWithDetails>;
	findById(id: string): Promise<QueueEntryWithDetails | null>;
	findByRestaurantAndStatus(
		restaurantId: string,
		status?: QueueStatus,
	): Promise<QueueEntryWithDetails[]>;
	findByUser(userId: string, status?: QueueStatus): Promise<QueueEntryWithDetails[]>;
	updateStatus(params: UpdateQueueStatusParams): Promise<QueueEntryWithDetails>;
	assignTables(params: AssignTablesParams): Promise<TableAssignment[]>;
	releaseTable(assignmentId: string): Promise<TableAssignment>;
	updatePositionAndEta(
		id: string,
		position: number | null,
		estimatedWaitMinutes: number | null,
	): Promise<QueueEntry>;
}
