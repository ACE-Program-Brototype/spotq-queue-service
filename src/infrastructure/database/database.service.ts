import type { IHealthCheckable } from '@domain/index.ts';
import type { PrismaClient } from '@prisma/client';
import { prisma } from './prisma.ts';

export class DatabaseService implements IHealthCheckable {
	private readonly client: PrismaClient;

	constructor(client: PrismaClient = prisma) {
		this.client = client;
	}

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

export const databaseService = new DatabaseService(prisma);
export const PrismaService = databaseService;
