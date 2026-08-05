import { prisma } from './prisma.js';

// biome-ignore lint/complexity/noStaticOnlyClass: service structure uses static class methods
export class PrismaService {
	static async connect(): Promise<void> {
		await prisma.$connect();
		// Execute a ping query to validate database connection on startup
		await prisma.$queryRaw`SELECT 1`;
	}

	static async disconnect(): Promise<void> {
		await prisma.$disconnect();
	}

	static async isHealthy(): Promise<boolean> {
		try {
			await prisma.$queryRaw`SELECT 1`;
			return true;
		} catch {
			return false;
		}
	}
}
