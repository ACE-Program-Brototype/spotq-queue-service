export class PersistenceError extends Error {
	constructor(
		message: string,
		public readonly cause?: unknown,
		public readonly code: string = 'PERSISTENCE_ERROR',
	) {
		super(message);
		this.name = 'PersistenceError';
		Object.setPrototypeOf(this, new.target.prototype);
	}
}
