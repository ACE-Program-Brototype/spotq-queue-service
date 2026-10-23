/**
 * Immutable properties representing a TableAssignment record in the domain model.
 */
export interface TableAssignmentProps {
	id: string;
	queueEntryId: string;
	tableId: string;
	assignedBy: string;
	assignedAt: Date;
	releasedAt?: Date | null;
}

/**
 * Parameters required to create a new TableAssignment.
 */
export interface CreateTableAssignmentProps {
	id?: string;
	queueEntryId: string;
	tableId: string;
	assignedBy: string;
	assignedAt?: Date;
}

/**
 * TableAssignment Domain Entity.
 *
 * Encapsulates a table assigned to a queue entry by restaurant staff.
 */
export class TableAssignment {
	private constructor(private readonly props: TableAssignmentProps) {}

	/**
	 * Factory method to instantiate a new table assignment.
	 */
	public static create(props: CreateTableAssignmentProps): TableAssignment {
		return new TableAssignment({
			id: props.id ?? crypto.randomUUID(),
			queueEntryId: props.queueEntryId,
			tableId: props.tableId,
			assignedBy: props.assignedBy,
			assignedAt: props.assignedAt ?? new Date(),
			releasedAt: null,
		});
	}

	/**
	 * Reconstitutes an existing TableAssignment from persistence.
	 */
	public static reconstitute(props: TableAssignmentProps): TableAssignment {
		return new TableAssignment(props);
	}

	public get id(): string {
		return this.props.id;
	}

	public get queueEntryId(): string {
		return this.props.queueEntryId;
	}

	public get tableId(): string {
		return this.props.tableId;
	}

	public get assignedBy(): string {
		return this.props.assignedBy;
	}

	public get assignedAt(): Date {
		return this.props.assignedAt;
	}

	public get releasedAt(): Date | null | undefined {
		return this.props.releasedAt;
	}

	public release(): void {
		this.props.releasedAt = new Date();
	}

	public toJSON(): TableAssignmentProps {
		return { ...this.props };
	}
}
