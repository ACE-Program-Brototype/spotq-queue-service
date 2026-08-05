import fs from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { config } from '../config/index.js';

const dbUrl = new URL(config.database.directUrl);

// Setup secure SSL/TLS configuration
let ssl: pg.PoolConfig['ssl'];

const caCert = process.env.DATABASE_CA_CERT;
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
} else if (config.server.nodeEnv === 'production') {
	// In production, force secure SSL/TLS validation by default
	ssl = {
		rejectUnauthorized: true,
	};
} else {
	// In development/testing, default to rejectUnauthorized: true unless explicitly set to false
	ssl = {
		rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
	};
}

// If we are enforcing TLS verification, strip sslmode from the URL to prevent pg from disabling validation
if (ssl?.rejectUnauthorized) {
	dbUrl.searchParams.delete('sslmode');
}

const pool = new pg.Pool({
	connectionString: dbUrl.toString(),
	ssl,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
	adapter,
	log: ['warn', 'error'],
});
