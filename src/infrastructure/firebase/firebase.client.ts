import { config } from '@infrastructure/config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { type App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

let firebaseApp: App | null = null;
let messagingClient: Messaging | null = null;

/**
 * Returns an initialized Firebase Cloud Messaging client singleton.
 * Returns null if Firebase is disabled or credentials are not provided.
 */
export function getFirebaseMessaging(): Messaging | null {
	if (!config.firebase.enabled) {
		logger.debug('Firebase Cloud Messaging is explicitly disabled in config.');
		return null;
	}

	if (messagingClient) {
		return messagingClient;
	}

	if (getApps().length > 0) {
		firebaseApp = getApps()[0];
		messagingClient = getMessaging(firebaseApp);
		return messagingClient;
	}

	if (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey) {
		logger.warn(
			'Firebase service account credentials missing. FCM running in unconfigured/mock mode.',
		);
		return null;
	}

	const credentialData = {
		projectId: config.firebase.projectId,
		clientEmail: config.firebase.clientEmail,
		privateKey: config.firebase.privateKey.replace(/\\n/g, '\n'),
	};

	try {
		firebaseApp = initializeApp({
			credential: cert(credentialData),
			projectId: credentialData.projectId,
		});
		messagingClient = getMessaging(firebaseApp);
		logger.info(
			{ projectId: credentialData.projectId },
			'Firebase Admin SDK initialized successfully for FCM',
		);
		return messagingClient;
	} catch (error) {
		logger.error({ err: error }, 'Failed to initialize Firebase Admin SDK');
		return null;
	}
}

/**
 * Helper to override or reset messaging client for unit testing.
 */
export function setFirebaseMessagingForTesting(client: Messaging | null): void {
	messagingClient = client;
}
