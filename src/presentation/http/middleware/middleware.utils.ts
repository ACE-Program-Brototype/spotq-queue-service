export function getHeaderValue(header: string | string[] | undefined): string | undefined {
	if (Array.isArray(header)) {
		return header[0];
	}
	return header;
}
