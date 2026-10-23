import type { Response } from 'express';
import { HTTP_STATUS } from '../constants/http.constants.ts';
import { messages } from '../constants/message.constants.ts';

/**
 * Standard API response envelope models.
 */
export interface ApiResponseSuccess<T = unknown> {
	success: true;
	message: string;
	data: T;
	statusCode: number;
}

export interface ApiResponsePaginatedSuccess<T = unknown> {
	success: true;
	message: string;
	data: T[];
	pagination: unknown;
	statusCode: number;
}

export interface ApiResponseError {
	success: false;
	message: string;
	code: string;
	error?: unknown;
	statusCode: number;
}

/**
 * Encapsulates successful HTTP response payloads.
 */
export class SuccessResponse<T> {
	public readonly success = true;
	public readonly timestamp: string;

	constructor(
		public readonly message: string,
		public readonly data?: T,
	) {
		this.timestamp = new Date().toISOString();
	}
}

/**
 * Encapsulates error HTTP response payloads.
 */
export class ErrorResponse {
	public readonly success = false;
	public readonly timestamp: string;

	constructor(
		public readonly error: string,
		public readonly message: string,
		public readonly details?: unknown,
	) {
		this.timestamp = new Date().toISOString();
	}
}

/**
 * Factory utilities for constructing uniform API response envelopes.
 */
export const ApiResponse = {
	ok<T>(
		data: T,
		message: string = messages.SUCCESS,
		statusCode: number = HTTP_STATUS.OK,
	): ApiResponseSuccess<T> {
		return {
			success: true,
			message,
			data,
			statusCode,
		};
	},

	okPaginated<T>(
		data: T[],
		pagination: unknown,
		message: string = messages.SUCCESS,
		statusCode: number = HTTP_STATUS.OK,
	): ApiResponsePaginatedSuccess<T> {
		return {
			success: true,
			message,
			data,
			pagination,
			statusCode,
		};
	},

	error(
		message: string,
		code = 'INTERNAL_SERVER_ERROR',
		statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
		error?: unknown,
	): ApiResponseError {
		return {
			success: false,
			message,
			code,
			error: typeof error === 'string' ? error : code,
			statusCode,
		};
	},
};

/**
 * Helper to send successful HTTP responses.
 */
export function sendSuccessResponse<T>(
	res: Response,
	data: T,
	message: string = messages.SUCCESS,
	statusCode: number = HTTP_STATUS.OK,
): Response {
	return res.status(statusCode).json(ApiResponse.ok(data, message, statusCode));
}

/**
 * Helper to send error HTTP responses with unified code and error string fields.
 */
export function sendErrorResponse(
	res: Response,
	errorOrMessage: string,
	messageOrCode?: string,
	statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
	details?: unknown,
): Response {
	let code = errorOrMessage;
	let msg = messageOrCode || errorOrMessage;

	if (errorOrMessage.includes(' ') && messageOrCode && !messageOrCode.includes(' ')) {
		msg = errorOrMessage;
		code = messageOrCode;
	} else if (messageOrCode?.includes(' ')) {
		code = errorOrMessage;
		msg = messageOrCode;
	}

	return res.status(statusCode).json({
		success: false,
		message: msg,
		code,
		error: code,
		details,
		statusCode,
	});
}
