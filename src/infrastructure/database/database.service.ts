import { prisma } from './prisma.js';

export class DatabaseService {
	async connect(): Promise<void> {
		await prisma.$connect();
	}

	async disconnect(): Promise<void> {
		await prisma.$disconnect();
	}

	async isHealthy(): Promise<boolean> {
		try {
			await prisma.$queryRaw`SELECT 1`;
			return true;
		} catch {
			return false;
		}
	}
}

export const databaseService = new DatabaseService();
