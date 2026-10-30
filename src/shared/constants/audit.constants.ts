export const AUDIT_CONSTANTS = {
	SYSTEM: 'system',
} as const;

export type AuditUser = (typeof AUDIT_CONSTANTS)[keyof typeof AUDIT_CONSTANTS];
