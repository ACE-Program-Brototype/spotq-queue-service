export interface ILogger {
	info(messageOrObj: string | object, messageOrArg?: unknown, ...args: unknown[]): void;
	error(messageOrObj: string | object, messageOrArg?: unknown, ...args: unknown[]): void;
	warn(messageOrObj: string | object, messageOrArg?: unknown, ...args: unknown[]): void;
	debug?(messageOrObj: string | object, messageOrArg?: unknown, ...args: unknown[]): void;
}
