import 'reflect-metadata';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/spotq_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.MOCK_TABLE_CHECK = 'true';
process.env.FIREBASE_PROJECT_ID = 'spotq-test';
process.env.FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk-test@spotq-test.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY =
	'-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3\n-----END PRIVATE KEY-----\n';
const testS2SPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAob4PvfBobzIUNjXBa9KN
ocPrBretXFhMPnZV/UxC6/0/Dtx2S2Y2VpXiLB8H0PT8PBoX0FQU4RDXX6glLrDw
Of+IiSZ+oFOLkllbtgTVJ0StXIAMpq63cUjjBvLgWtua4iwhQtVHkCnx5VyhpGq4
lJonwfOwxXbwUidfz0aLWfzrgi9ikYcFyt0JyqBkKzzAeierYRvKB6ltkRl8U+pT
JnPhx7QsNQ/8KihvOhZ9mAzsKVtOK3sg5qeL8YuY9xggiV0ML5kfuCpCtfJQQlse
FjOxL/+0/E2qeBIiFJDRrJmFhDV/spJqJwNxKyOzEayYVDxOHV9htdxff/57qb20
WwIDAQAB
-----END PUBLIC KEY-----`;
process.env.S2S_ORDER_PUBLIC = testS2SPublicKey;
process.env.S2S_RESTAURANT_PUBLIC = testS2SPublicKey;
