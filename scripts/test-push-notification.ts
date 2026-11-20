import 'reflect-metadata';
import process from 'node:process';
import { FirebasePushNotificationService } from '../src/infrastructure/firebase/index.ts';

async function main() {
	const token = process.argv[2];

	console.log('\n========================================');
	console.log('🚀 FCM Live Integration Test');
	console.log('========================================\n');

	if (!token) {
		console.log('ℹ️  No token provided. Running in live API verification mode with test token...');
		console.log('👉 To send to a real device, run:');
		console.log('   pnpm tsx scripts/test-push-notification.ts <YOUR_REAL_DEVICE_FCM_TOKEN>\n');
	}

	const targetFid = token || 'dummy_live_verification_fid_12345';
	const service = new FirebasePushNotificationService();

	console.log(`📡 Dispatching test push notification to FID: ${targetFid.slice(0, 15)}...`);

	const result = await service.send({
		fid: targetFid,
		title: '🎉 SpotQ Queue Alert',
		body: 'Your table for 2 is ready! Please proceed to the host stand.',
		data: {
			queueEntryId: 'test-entry-001',
			restaurantId: 'rest-demo',
			event: 'TABLE_READY',
		},
		deepLink: '/queue/status',
	});

	console.log('\n========================================');
	console.log('📊 Result:');
	console.log(JSON.stringify(result, null, 2));
	console.log('========================================\n');

	if (result.success) {
		console.log('✅ Notification successfully accepted by Google FCM!');
	} else if (result.isTokenInvalid) {
		console.log(
			'ℹ️  Google FCM rejected the token format or registration (expected for dummy tokens).',
		);
		console.log('✅ Authentication with Google Firebase Admin SDK succeeded!');
	} else {
		console.error('❌ Failed with transient error or misconfiguration.');
	}
}

main().catch((err) => {
	console.error('Fatal execution error:', err);
	process.exit(1);
});
