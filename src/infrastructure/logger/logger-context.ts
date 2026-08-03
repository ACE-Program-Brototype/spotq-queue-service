import { AsyncLocalStorage } from 'node:async_hooks';

export interface LoggerStore {
	requestId: string;
	correlationId: string;
}

export const loggerLocalStorage = new AsyncLocalStorage<LoggerStore>();
