import fs from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { config } from '../config/index.js';

const dbUrl = new URL(config.database.directUrl);

// Setup secure SSL/TLS configuration
let ssl: pg.PoolConfig['ssl'];

const caCert = process.env.DATABASE_CA_CERT;
const initialSslMode = dbUrl.searchParams.get('sslmode');
const isExplicitNoVerify =
	initialSslMode === 'no-verify' ||
	initialSslMode === 'disable' ||
	process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false';

if (caCert) {
	let caContent = caCert;
	// If it doesn't look like a direct PEM string, try to read it as a file path
	if (!caCert.includes('-----BEGIN CERTIFICATE-----')) {
		try {
			caContent = fs.readFileSync(caCert, 'utf8');
		} catch (error) {
			console.error(`Failed to read database CA cert from path: ${caCert}`, error);
		}
	}
	ssl = {
		rejectUnauthorized: true,
		ca: caContent,
	};
} else {
	// Default to secure SSL/TLS validation unless explicitly disabled in connection string or env variable
	ssl = {
		rejectUnauthorized: !isExplicitNoVerify,
	};
}

// Synchronize sslmode parameter for both pg.Pool and Prisma engine
if (ssl) {
	if (ssl.rejectUnauthorized) {
		dbUrl.searchParams.set('sslmode', 'require');
	} else {
		dbUrl.searchParams.set('sslmode', 'no-verify');
	}
}

// Override DATABASE_URL in process.env so that Prisma's internal query engine sees the modified SSL parameters
process.env.DATABASE_URL = dbUrl.toString();

const pool = new pg.Pool({
	connectionString: dbUrl.toString(),
	ssl,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
	adapter,
	log: ['warn', 'error'],
});
