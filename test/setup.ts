import 'reflect-metadata';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/spotq_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.MOCK_TABLE_CHECK = 'true';
