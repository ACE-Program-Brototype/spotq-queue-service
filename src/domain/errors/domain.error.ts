export abstract class DomainError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = this.constructor.name;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}
