export function encodeObject(obj: unknown): string {
	/**
	 * Encodes an object to a string using JSON serialization and Base64 encoding.
	 *
	 * Args:
	 *     obj: The object to encode.
	 *
	 * Returns:
	 *     A string representation of the object.
	 */
	const jsonString: string = JSON.stringify(obj);
	const encodedString: string = btoa(unescape(encodeURIComponent(jsonString))); // btoa expects only ASCII chars
	return encodedString;
}

export function decodeString(encodedString: string): unknown {
	/**
	 * Decodes a string to an object using Base64 decoding and JSON deserialization.
	 *
	 * Args:
	 *     encodedString: The string to decode.
	 *
	 * Returns:
	 *     The decoded object.
	 */
	try {
		const jsonString: string = decodeURIComponent(escape(atob(encodedString)));
		const obj: unknown = JSON.parse(jsonString);
		return obj;
	} catch {
		return null;
	}
}
