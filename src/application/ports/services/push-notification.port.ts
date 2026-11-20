export interface PushNotificationPayload {
	/**
	 * Firebase Installation ID (FID) to target.
	 */
	fid: string;

	/**
	 * User-visible notification headline/title.
	 */
	title: string;

	/**
	 * User-visible notification body text.
	 */
	body: string;

	/**
	 * Optional string key-value data payload for app consumption.
	 */
	data?: Record<string, string>;

	/**
	 * Deep link navigation metadata (e.g., `/queue/:queueEntryId` or `spotq://ticket/:id`).
	 */
	deepLink?: string;
}

export interface PushNotificationResult {
	/**
	 * True if successfully accepted by Firebase Cloud Messaging.
	 */
	success: boolean;

	/**
	 * Unique message ID returned by FCM on success.
	 */
	messageId?: string;

	/**
	 * Error description if dispatch failed.
	 */
	error?: string;

	/**
	 * Set to true if failure was caused by an invalid/expired/unregistered device token.
	 */
	isTokenInvalid?: boolean;
}

/**
 * Reusable push notification port decoupling domain/application logic from Firebase Admin SDK.
 */
export interface IPushNotificationService {
	/**
	 * Sends a push notification to a specific FCM device token with bounded retries.
	 */
	send(payload: PushNotificationPayload): Promise<PushNotificationResult>;
}
