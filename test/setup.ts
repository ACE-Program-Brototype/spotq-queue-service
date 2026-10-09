process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '3004';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'spotq-queue-service';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'fatal';
process.env.DATABASE_URL =
	process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/spotq_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
