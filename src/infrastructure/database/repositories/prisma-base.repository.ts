import { DomainError } from '@domain/errors/domain.error.ts';
import type {
	IBaseRepository,
	PaginatedResult,
	PaginationOptions,
} from '@domain/repositories/base.repository.interface.ts';
import { PersistenceError } from '@infrastructure/errors/persistence.error.ts';
import { Prisma } from '@prisma/client';
import type { IEntityMapper } from '../mappers/queue-entry.mapper.ts';

export type PrismaErrorFactory = (error: unknown) => Error;
export type PrismaErrorMap = Record<string, PrismaErrorFactory>;

/**
 * Abstract generic Prisma Base Repository.
 *
 * Implements common CRUD operations (create, update, delete, findById, save, findPaginated)
 * and isolates domain logic from database infrastructure failures by translating Prisma
 * errors into structured PersistenceError instances.
 *
 * @template TDomain - The clean domain entity type
 * @template TModel - The raw database persistence model type from Prisma
 * @template TDelegate - The Prisma model delegate
 */
export abstract class PrismaBaseRepository<
	TDomain extends { id: string },
	TModel,
	TDelegate = unknown,
> implements IBaseRepository<TDomain, string>
{
	protected static readonly MAX_PAGE_SIZE = 100;

	constructor(
		protected readonly dbModel: TDelegate,
		protected readonly mapper: IEntityMapper<TDomain, TModel>,
		protected readonly errorMap: PrismaErrorMap = {},
	) {}

	// biome-ignore lint/suspicious/noExplicitAny: Internal bridge for generic base calls
	protected get delegate(): any {
		return this.dbModel;
	}

	/**
	 * Executes an asynchronous database query, automatically translating known Prisma errors.
	 *
	 * @param operation - Database callback operation
	 * @param methodErrorMap - Optional method-level error code mapping
	 * @returns The resolved result of the operation
	 */
	protected async run<R>(operation: () => Promise<R>, methodErrorMap?: PrismaErrorMap): Promise<R> {
		try {
			return await operation();
		} catch (error) {
			throw this.translateError(error, methodErrorMap);
		}
	}

	/**
	 * Translates unknown runtime and database errors into PersistenceError or preserves DomainErrors.
	 *
	 * @param error - The raw error caught
	 * @param methodErrorMap - Optional override mapping
	 * @returns A safe, typed Error instance
	 */
	protected translateError(error: unknown, methodErrorMap?: PrismaErrorMap): Error {
		if (error instanceof DomainError || error instanceof PersistenceError) {
			return error;
		}

		if (
			error instanceof TypeError ||
			error instanceof ReferenceError ||
			error instanceof RangeError
		) {
			return error;
		}

		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			const factory = methodErrorMap?.[error.code] ?? this.errorMap[error.code];
			if (factory) {
				try {
					return factory(error);
				} catch (factoryError) {
					return new PersistenceError('Failed to map database error', factoryError);
				}
			}

			return new PersistenceError(
				error.message || 'Database operation failed',
				error,
				`PRISMA_${error.code}`,
			);
		}

		if (error instanceof Prisma.PrismaClientInitializationError) {
			return new PersistenceError('Database connection initialization failed', error);
		}

		return new PersistenceError(
			error instanceof Error ? error.message : 'Database operation failed',
			error,
		);
	}

	/**
	 * Retrieves an entity by its unique ID.
	 *
	 * @param id - Entity UUID
	 * @returns Entity instance or null if not found
	 */
	public async findById(id: string): Promise<TDomain | null> {
		const record = await this.run(async () => {
			return (await this.delegate.findUnique({
				where: { id },
			})) as TModel | null;
		});
		return record ? this.mapper.toDomain(record) : null;
	}

	/**
	 * Inserts a new entity into the database.
	 *
	 * @param entity - Entity to persist
	 * @returns The persisted domain entity
	 */
	public async create(entity: TDomain): Promise<TDomain> {
		const record = await this.run(async () => {
			return (await this.delegate.create({
				data: this.mapper.toPersistence(entity),
			})) as TModel;
		});
		return this.mapper.toDomain(record);
	}

	/**
	 * Updates existing entity attributes by ID.
	 *
	 * @param id - Entity UUID
	 * @param data - Attributes to update
	 * @returns The updated domain entity
	 */
	public async update(
		id: string,
		data: Partial<TDomain> | Record<string, unknown>,
	): Promise<TDomain> {
		const record = await this.run(async () => {
			return (await this.delegate.update({
				where: { id },
				data,
			})) as TModel;
		});
		return this.mapper.toDomain(record);
	}

	/**
	 * Deletes an entity record by its unique ID.
	 *
	 * @param id - Entity UUID
	 */
	public async delete(id: string): Promise<void> {
		await this.run(async () => {
			await this.delegate.delete({ where: { id } });
		});
	}

	/**
	 * Upserts an entity record (creates if not existing, updates if present).
	 *
	 * @param entity - Domain entity to save
	 */
	public async save(entity: TDomain): Promise<void> {
		const data = this.mapper.toPersistence(entity);
		const { id, createdAt, ...updateData } = data as Record<string, unknown>;

		await this.run(async () => {
			await this.delegate.upsert({
				where: { id: entity.id },
				create: data,
				update: updateData,
			});
		});
	}

	/**
	 * Retrieves a paginated list of domain entities with filtering and sorting.
	 *
	 * @param options - Pagination, filter, and ordering parameters
	 * @returns Paginated result containing items and total record count
	 */
	public async findPaginated<TWhere = unknown, TOrderBy = unknown>(
		options: PaginationOptions<TWhere, TOrderBy>,
	): Promise<PaginatedResult<TDomain>> {
		const { where, orderBy, page, limit } = options;
		const take = Math.min(Math.max(limit, 1), PrismaBaseRepository.MAX_PAGE_SIZE);
		const skip = (Math.max(page, 1) - 1) * take;

		const [records, total] = await this.run(async () => {
			return Promise.all([
				this.delegate.findMany({ where, orderBy, skip, take }) as Promise<TModel[]>,
				this.delegate.count({ where }) as Promise<number>,
			]);
		});

		return {
			items: records.map((r) => this.mapper.toDomain(r)),
			total,
		};
	}

	/**
	 * Finds the first entity matching the given search criteria.
	 *
	 * @param where - Prisma where filter
	 * @returns Domain entity or null if not found
	 */
	public async findOne<TWhere = unknown>(where: TWhere): Promise<TDomain | null> {
		const record = await this.run(async () => {
			return (await this.delegate.findFirst({
				where,
			})) as TModel | null;
		});
		return record ? this.mapper.toDomain(record) : null;
	}
}
