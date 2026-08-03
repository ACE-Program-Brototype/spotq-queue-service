import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config/index.js';

const adapter = new PrismaPg(config.database.directUrl);

export const prisma = new PrismaClient({
	adapter,
	log: ['warn', 'error'],
});
