export const NOTIFICATION_MESSAGES = {
	TABLE_READY_TITLE: 'Your Table is Ready! 🍽️',
	TABLE_READY_BODY: (guestName: string) =>
		`${guestName}, your table is ready! Please proceed to the host stand.`,
	TABLE_READY_ALERT: 'Your table is ready! Please proceed to the host stand.',
} as const;
