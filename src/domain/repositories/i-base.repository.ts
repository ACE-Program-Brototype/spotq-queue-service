export interface PaginationOptions<TWhere = unknown, TOrderBy = unknown> {
	where?: TWhere;
	orderBy?: TOrderBy;
	page: number;
	limit: number;
}

export interface PaginatedResult<TDomain> {
	items: TDomain[];
	total: number;
}

export interface IBaseRepository<TDomain, ID = string> {
	findById(id: ID): Promise<TDomain | null>;
	create(entity: TDomain): Promise<TDomain>;
	update(id: ID, data: Partial<TDomain> | Record<string, unknown>): Promise<TDomain>;
	delete(id: ID): Promise<void>;
	save(entity: TDomain): Promise<void>;
	findPaginated<TWhere = unknown, TOrderBy = unknown>(
		options: PaginationOptions<TWhere, TOrderBy>,
	): Promise<PaginatedResult<TDomain>>;
}
