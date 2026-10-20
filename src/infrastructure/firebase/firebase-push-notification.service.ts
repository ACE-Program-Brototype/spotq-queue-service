import type {
	IPushNotificationService,
	PushNotificationPayload,
	PushNotificationResult,
} from '@application/ports/services/push-notification.port.ts';
import { config } from '@infrastructure/config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import type { Message } from 'firebase-admin/messaging';
import { injectable } from 'inversify';
import { getFirebaseMessaging } from './firebase.client.ts';
import {
	FCM_DEFAULTS,
	FCM_ERROR_MESSAGES,
	INVALID_TOKEN_ERROR_CODES,
	PERMANENT_CLIENT_ERROR_CODES,
} from './firebase.constants.ts';

@injectable()
export class FirebasePushNotificationService implements IPushNotificationService {
	private readonly maxRetries: number = config.firebase.maxRetries;
	private readonly retryDelayMs: number = config.firebase.retryDelayMs;

	async send(payload: PushNotificationPayload): Promise<PushNotificationResult> {
		const messaging = getFirebaseMessaging();
		if (!messaging) {
			logger.info(
				{ title: payload.title, fidSuffix: payload.fid?.slice(-6) },
				'FCM notification suppressed (Firebase client is not configured or disabled)',
			);
			return {
				success: true,
				messageId: FCM_DEFAULTS.MOCK_MESSAGE_ID,
			};
		}

		if (!payload.fid || typeof payload.fid !== 'string') {
			logger.warn({ payload }, 'Cannot send FCM notification: missing or invalid fid format');
			return {
				success: false,
				error: FCM_ERROR_MESSAGES.MISSING_TOKEN,
				isTokenInvalid: true,
			};
		}

		const enrichedData: Record<string, string> = { ...payload.data };
		if (payload.deepLink) {
			enrichedData.deepLink = payload.deepLink;
		}

		const message: Message = {
			fid: payload.fid,
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
				priority: FCM_DEFAULTS.ANDROID.PRIORITY,
				notification: {
					channelId: FCM_DEFAULTS.ANDROID.CHANNEL_ID,
					sound: FCM_DEFAULTS.ANDROID.SOUND,
				},
			},
			apns: {
				payload: {
					aps: {
						sound: FCM_DEFAULTS.APNS.SOUND,
						badge: FCM_DEFAULTS.APNS.BADGE,
					},
				},
			},
		};

		let attempt = 0;
		while (attempt <= this.maxRetries) {
			attempt++;
			try {
				const messageId = await messaging.send(message);
				logger.info(
					{ messageId, attempt, fidSuffix: payload.fid.slice(-6) },
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

				if (INVALID_TOKEN_ERROR_CODES.has(errorCode)) {
					logger.warn(
						{ errorCode, fidSuffix: payload.fid.slice(-6), err: errorMessage },
						'FCM target FID is invalid or no longer registered. Skipping retries.',
					);
					return {
						success: false,
						error: errorMessage,
						isTokenInvalid: true,
					};
				}

				if (PERMANENT_CLIENT_ERROR_CODES.has(errorCode)) {
					logger.error(
						{ errorCode, fidSuffix: payload.fid.slice(-6), err: errorMessage },
						'Permanent FCM client error encountered. Skipping retries.',
					);
					return {
						success: false,
						error: errorMessage,
						isTokenInvalid: false,
					};
				}

				if (attempt <= this.maxRetries) {
					const delay = this.retryDelayMs * attempt;
					logger.warn(
						{ attempt, maxRetries: this.maxRetries, delay, errorCode },
						'Transient FCM dispatch failure. Applying bounded retry with backoff...',
					);
					await this.sleep(delay);
					continue;
				}

				logger.error(
					{ err: error, attempt, fidSuffix: payload.fid.slice(-6) },
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
			error: FCM_ERROR_MESSAGES.MAX_RETRIES_EXCEEDED,
			isTokenInvalid: false,
		};
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
