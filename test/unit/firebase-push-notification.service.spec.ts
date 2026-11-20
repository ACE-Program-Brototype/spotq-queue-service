import {
	FirebasePushNotificationService,
	setFirebaseMessagingForTesting,
} from '@infrastructure/firebase/index.ts';
import type { Messaging } from 'firebase-admin/messaging';

describe('FirebasePushNotificationService', () => {
	let mockMessaging: { send: jest.Mock };
	let service: FirebasePushNotificationService;

	beforeEach(() => {
		jest.clearAllMocks();

		mockMessaging = {
			send: jest.fn().mockResolvedValue('projects/spotq/messages/msg-12345'),
		};

		setFirebaseMessagingForTesting(mockMessaging as unknown as Messaging);
		service = new FirebasePushNotificationService();
	});

	afterEach(() => {
		setFirebaseMessagingForTesting(null);
	});

	describe('send', () => {
		it('should successfully send a push notification and format message correctly with fid', async () => {
			const result = await service.send({
				fid: 'valid-device-fid-123456',
				title: 'Table Ready!',
				body: 'Your table for 2 is ready.',
				data: { queueEntryId: 'entry-123', event: 'TABLE_READY' },
				deepLink: '/queue/entry-123',
			});

			expect(result.success).toBe(true);
			expect(result.messageId).toBe('projects/spotq/messages/msg-12345');
			expect(mockMessaging.send).toHaveBeenCalledTimes(1);

			const sentMessage = mockMessaging.send.mock.calls[0][0];
			expect(sentMessage.fid).toBe('valid-device-fid-123456');
			expect(sentMessage.notification).toEqual({
				title: 'Table Ready!',
				body: 'Your table for 2 is ready.',
			});
			expect(sentMessage.data).toEqual({
				queueEntryId: 'entry-123',
				event: 'TABLE_READY',
				deepLink: '/queue/entry-123',
			});
			expect(sentMessage.webpush?.fcmOptions?.link).toBe('/queue/entry-123');
			expect(sentMessage.android?.priority).toBe('high');
		});

		it('should return mock result when Firebase messaging client is null/disabled', async () => {
			setFirebaseMessagingForTesting(null);

			const result = await service.send({
				fid: 'fid-123',
				title: 'Test Title',
				body: 'Test Body',
			});

			expect(result.success).toBe(true);
			expect(result.messageId).toBe('mock-fcm-id');
		});

		it('should return isTokenInvalid when fid is missing or empty', async () => {
			const result = await service.send({
				fid: '',
				title: 'Test',
				body: 'Test',
			});

			expect(result.success).toBe(false);
			expect(result.isTokenInvalid).toBe(true);
			expect(mockMessaging.send).not.toHaveBeenCalled();
		});

		it('should identify unregistered/invalid token errors as permanent and not retry', async () => {
			const invalidTokenError = Object.assign(new Error('Requested entity was not found.'), {
				code: 'messaging/registration-token-not-registered',
			});

			mockMessaging.send.mockRejectedValueOnce(invalidTokenError);

			const result = await service.send({
				fid: 'expired-fid-123',
				title: 'Notice',
				body: 'Your table is ready',
			});

			expect(result.success).toBe(false);
			expect(result.isTokenInvalid).toBe(true);
			expect(mockMessaging.send).toHaveBeenCalledTimes(1); // No retries for permanent errors
		});

		it('should identify permanent client errors and fail immediately without retry', async () => {
			const payloadError = Object.assign(new Error('Payload size limit exceeded'), {
				code: 'messaging/payload-size-limit-exceeded',
			});

			mockMessaging.send.mockRejectedValueOnce(payloadError);

			const result = await service.send({
				fid: 'valid-fid-123',
				title: 'Heavy Payload',
				body: 'Too much data',
			});

			expect(result.success).toBe(false);
			expect(result.isTokenInvalid).toBe(false);
			expect(mockMessaging.send).toHaveBeenCalledTimes(1); // No retries
		});

		it('should retry on transient server errors and succeed on subsequent attempt', async () => {
			const serverUnavailableError = Object.assign(new Error('FCM server temporarily overloaded'), {
				code: 'messaging/server-unavailable',
			});

			mockMessaging.send
				.mockRejectedValueOnce(serverUnavailableError)
				.mockResolvedValueOnce('projects/spotq/messages/msg-recovered');

			const result = await service.send({
				fid: 'valid-fid-123',
				title: 'Retry Test',
				body: 'Should recover on second attempt',
			});

			expect(result.success).toBe(true);
			expect(result.messageId).toBe('projects/spotq/messages/msg-recovered');
			expect(mockMessaging.send).toHaveBeenCalledTimes(2);
		});

		it('should fail gracefully when bounded retries are exhausted on transient errors', async () => {
			const internalError = Object.assign(new Error('Internal FCM error'), {
				code: 'messaging/internal-error',
			});

			mockMessaging.send.mockRejectedValue(internalError);

			const result = await service.send({
				fid: 'valid-fid-123',
				title: 'Exhausted Retries',
				body: 'Will fail after retries',
			});

			expect(result.success).toBe(false);
			expect(result.isTokenInvalid).toBe(false);
			expect(mockMessaging.send).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
		});
	});
});
