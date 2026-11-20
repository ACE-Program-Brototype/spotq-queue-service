import { TYPES } from '@di/types.ts';
import type { IHealthCheckable } from '@domain/index.ts';
import type { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { prisma } from './prisma.ts';

@injectable()
export class DatabaseService implements IHealthCheckable {
	constructor(
		@inject(TYPES.Database.PrismaClient)
		private readonly client: PrismaClient = prisma,
	) {}

	async connect(): Promise<void> {
		await this.client.$connect();
	}

	async disconnect(): Promise<void> {
		await this.client.$disconnect();
	}

	async isHealthy(): Promise<boolean> {
		try {
			await this.client.$queryRaw`SELECT 1`;
			return true;
		} catch {
			return false;
		}
	}
}
