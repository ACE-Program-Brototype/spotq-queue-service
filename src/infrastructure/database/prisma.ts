import fs from 'node:fs';
import { logger } from '@infrastructure/logger/index.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { config } from '../config/index.ts';

const caCert = config.database.caCert;
let sslConfig: pg.ConnectionConfig['ssl'] | undefined;

if (caCert) {
	try {
		const certContent = fs.readFileSync(caCert, 'utf-8');
		sslConfig = {
			ca: certContent,
			rejectUnauthorized: true,
		};
	} catch (error) {
		logger.error(
			{ err: error, context: { path: caCert } },
			'Failed to read database CA cert from path',
		);
		sslConfig = {
			rejectUnauthorized: false,
		};
	}
} else {
	const dbUrl = config.database.url || '';
	const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
	const isAivenOrCloud =
		dbUrl.includes('aivencloud.com') ||
		dbUrl.includes('render.com') ||
		dbUrl.includes('neon.tech') ||
		dbUrl.includes('aws.com');
	const hasSslNoVerify = dbUrl.includes('sslmode=no-verify');
	const hasSslRequire = dbUrl.includes('sslmode=require') || dbUrl.includes('sslmode=prefer');

	if (hasSslNoVerify || isAivenOrCloud || (!isLocalhost && hasSslRequire)) {
		sslConfig = {
			rejectUnauthorized: false,
		};
	}
}

let connectionString = config.database.url;
if (
	connectionString &&
	(connectionString.includes('aivencloud.com') || connectionString.includes('sslmode=no-verify'))
) {
	try {
		const parsedUrl = new URL(connectionString);
		parsedUrl.searchParams.delete('sslmode');
		parsedUrl.searchParams.delete('sslrootcert');
		parsedUrl.searchParams.set('sslmode', 'no-verify');
		connectionString = parsedUrl.toString();
		process.env.DATABASE_URL = connectionString;
	} catch {}
}

const pool = new pg.Pool({
	connectionString,
	ssl: sslConfig,
	max: 10,
	idleTimeoutMillis: 30000,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
	adapter,
	log: [
		{ emit: 'event', level: 'error' },
		{ emit: 'event', level: 'warn' },
	],
});

prisma.$on('error' as never, (e: { message: string; target?: string }) => {
	logger.error(
		{
			error: {
				name: 'PrismaClientError',
				message: e.message,
			},
			context: {
				target: e.target,
			},
		},
		'Prisma database error',
	);
});

prisma.$on('warn' as never, (e: { message: string }) => {
	logger.warn(
		{
			error: {
				name: 'PrismaClientWarning',
				message: e.message,
			},
		},
		'Prisma database warning',
	);
});
