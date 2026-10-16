import type { DomainError } from '@domain/errors/domain.error.ts';
import { HTTP_STATUS } from '../constants/http.constants.ts';

/**
 * Maps HTTP-agnostic domain error codes to corresponding HTTP status codes.
 * Ensures domain entities, value objects, and domain errors remain 100% HTTP-agnostic
 * while presentation/shared layers handle HTTP response status code mapping.
 *
 * @param err - DomainError instance or object containing error code and optional details
 * @returns Standard HTTP status code number
 */
export function mapDomainErrorToHttpStatus(
	err: DomainError | { code: string; details?: unknown },
): number {
	switch (err.code) {
		case 'TABLES_AVAILABLE':
		case 'RESTAURANT_NOT_ACCEPTING_QUEUE':
		case 'ACTIVE_QUEUE_ENTRY_EXISTS':
			return HTTP_STATUS.CONFLICT;

		case 'QUEUE_ENTRY_NOT_FOUND':
		case 'RESTAURANT_NOT_FOUND':
			return HTTP_STATUS.NOT_FOUND;

		case 'FORBIDDEN':
		case 'RESTAURANT_BLOCKED':
		case 'SUBSCRIPTION_REQUIRED':
			return HTTP_STATUS.FORBIDDEN;

		case 'INVALID_PARTY_SIZE':
		case 'INVALID_REGISTRATION_TYPE':
			return HTTP_STATUS.BAD_REQUEST;

		case 'UPSTREAM_SERVICE_UNAVAILABLE':
			return (
				(err.details as { upstreamStatusCode?: number })?.upstreamStatusCode ||
				HTTP_STATUS.SERVICE_UNAVAILABLE
			);

		default:
			return HTTP_STATUS.BAD_REQUEST;
	}
}
