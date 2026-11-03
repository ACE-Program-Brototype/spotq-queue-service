export interface ILogger {
	info(mergObj: object, message?: string, ...args: unknown[]): void;
	info(message: string, ...args: unknown[]): void;
	error(mergObj: object, message?: string, ...args: unknown[]): void;
	error(message: string, ...args: unknown[]): void;
	warn(mergObj: object, message?: string, ...args: unknown[]): void;
	warn(message: string, ...args: unknown[]): void;
	debug?(mergObj: object, message?: string, ...args: unknown[]): void;
	debug?(message: string, ...args: unknown[]): void;
}
