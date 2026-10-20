export const INVALID_TOKEN_ERROR_CODES = new Set([
	'messaging/invalid-registration-token',
	'messaging/registration-token-not-registered',
	'messaging/invalid-argument',
]);

export const PERMANENT_CLIENT_ERROR_CODES = new Set([
	'messaging/authentication-error',
	'messaging/mismatched-credential',
	'messaging/forbidden',
	'messaging/invalid-payload',
	'messaging/payload-size-limit-exceeded',
	'messaging/invalid-data-payload-key',
	'messaging/third-party-auth-error',
	'messaging/invalid-recipient',
	'messaging/invalid-options',
]);

export const RETRYABLE_ERROR_CODES = new Set([
	'messaging/server-unavailable',
	'messaging/internal-error',
	'messaging/device-message-rate-exceeded',
	'messaging/unavailable',
]);

export const FCM_ERROR_MESSAGES = {
	MISSING_TOKEN: 'Missing or invalid token format',
	MAX_RETRIES_EXCEEDED: 'Max bounded retries exceeded',
} as const;

export const FCM_DEFAULTS = {
	MOCK_MESSAGE_ID: 'mock-fcm-id',
	ANDROID: {
		CHANNEL_ID: 'queue_alerts',
		PRIORITY: 'high' as const,
		SOUND: 'default',
	},
	APNS: {
		SOUND: 'default',
		BADGE: 1,
	},
} as const;
