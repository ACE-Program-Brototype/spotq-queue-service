import type {
	IPushNotificationService,
	PushNotificationPayload,
	PushNotificationResult,
} from '@application/ports/services/push-notification.port.ts';
import { logger } from '@infrastructure/logger/index.ts';
import type { Message } from 'firebase-admin/messaging';
import { injectable } from 'inversify';
import { getFirebaseMessaging } from './firebase.client.ts';

/**
 * Firebase error codes indicating an invalid, expired, or unregistered device token.
 * These are permanent failures and should never be retried.
 */
const INVALID_TOKEN_ERROR_CODES = new Set([
	'messaging/invalid-registration-token',
	'messaging/registration-token-not-registered',
	'messaging/invalid-argument',
]);

/**
 * Firebase error codes indicating a transient server error where retries are appropriate.
 */
const RETRYABLE_ERROR_CODES = new Set([
	'messaging/server-unavailable',
	'messaging/internal-error',
	'messaging/device-message-rate-exceeded',
	'messaging/unavailable',
]);

@injectable()
export class FirebasePushNotificationService implements IPushNotificationService {
	private static readonly MAX_RETRIES = 2;
	private static readonly RETRY_DELAY_MS = 500;

	/**
	 * Dispatches a push notification to an FCM device token with bounded retries and error isolation.
	 */
	async send(payload: PushNotificationPayload): Promise<PushNotificationResult> {
		const messaging = getFirebaseMessaging();
		if (!messaging) {
			logger.info(
				{ title: payload.title, tokenSuffix: payload.token?.slice(-6) },
				'FCM notification suppressed (Firebase client is not configured or disabled)',
			);
			return {
				success: true,
				messageId: 'mock-fcm-id',
			};
		}

		if (!payload.token || typeof payload.token !== 'string') {
			logger.warn({ payload }, 'Cannot send FCM notification: missing or invalid token format');
			return {
				success: false,
				error: 'Missing or invalid token format',
				isTokenInvalid: true,
			};
		}

		const enrichedData: Record<string, string> = { ...payload.data };
		if (payload.deepLink) {
			enrichedData.deepLink = payload.deepLink;
		}

		const message: Message = {
			token: payload.token,
			notification: {
				title: payload.title,
				body: payload.body,
			},
			data: enrichedData,
			webpush: payload.deepLink
				? {
						fcmOptions: {
							link: payload.deepLink,
						},
					}
				: undefined,
			android: {
				priority: 'high',
				notification: {
					channelId: 'queue_alerts',
					sound: 'default',
				},
			},
			apns: {
				payload: {
					aps: {
						sound: 'default',
						badge: 1,
					},
				},
			},
		};

		let attempt = 0;
		while (attempt <= FirebasePushNotificationService.MAX_RETRIES) {
			attempt++;
			try {
				const messageId = await messaging.send(message);
				logger.info(
					{ messageId, attempt, tokenSuffix: payload.token.slice(-6) },
					'Push notification sent successfully',
				);
				return {
					success: true,
					messageId,
				};
			} catch (error: unknown) {
				const err = error as { code?: string; message?: string };
				const errorCode = err?.code || '';
				const errorMessage = err?.message || String(error);

				// 1. Permanent failure - invalid or unregistered token
				if (INVALID_TOKEN_ERROR_CODES.has(errorCode)) {
					logger.warn(
						{ errorCode, tokenSuffix: payload.token.slice(-6), err: errorMessage },
						'FCM token is invalid or no longer registered. Skipping retries.',
					);
					return {
						success: false,
						error: errorMessage,
						isTokenInvalid: true,
					};
				}

				// 2. Transient failure - check if eligible for retry
				const isTransient =
					RETRYABLE_ERROR_CODES.has(errorCode) ||
					errorMessage.includes('timeout') ||
					errorMessage.includes('ECONNRESET') ||
					errorMessage.includes('ETIMEDOUT');

				if (isTransient && attempt <= FirebasePushNotificationService.MAX_RETRIES) {
					const delay = FirebasePushNotificationService.RETRY_DELAY_MS * attempt;
					logger.warn(
						{ attempt, maxRetries: FirebasePushNotificationService.MAX_RETRIES, delay, errorCode },
						'Transient FCM dispatch failure. Applying bounded retry with backoff...',
					);
					await this.sleep(delay);
					continue;
				}

				// 3. Final failure after retries or non-retryable error
				logger.error(
					{ err: error, attempt, tokenSuffix: payload.token.slice(-6) },
					'Failed to dispatch FCM push notification',
				);
				return {
					success: false,
					error: errorMessage,
					isTokenInvalid: false,
				};
			}
		}

		return {
			success: false,
			error: 'Max bounded retries exceeded',
			isTokenInvalid: false,
		};
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
