import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { config } from '../../config/index.js';

const pool = new pg.Pool({
	connectionString: config.database.directUrl,
	ssl: {
		rejectUnauthorized: false,
	},
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
	adapter,
	log: ['warn', 'error'],
});
