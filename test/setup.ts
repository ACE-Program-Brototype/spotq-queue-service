import 'reflect-metadata';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/spotq_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.MOCK_TABLE_CHECK = 'true';
process.env.FIREBASE_PROJECT_ID = 'spotq-test';
process.env.FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk-test@spotq-test.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY =
	'-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3\n-----END PRIVATE KEY-----\n';
