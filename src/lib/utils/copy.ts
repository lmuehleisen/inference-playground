/**
 * Copies a string to the clipboard, with a fallback for older browsers.
 *
 * @param text The string to copy to the clipboard.
 * @returns A promise that resolves when the text has been successfully copied,
 *          or rejects if the copy operation fails.
 */
export async function copyToClipboard(text: string): Promise<void> {
	if (navigator.clipboard) {
		try {
			await navigator.clipboard.writeText(text);
			return; // Resolve immediately if successful
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		} catch (_) {
			// Fallback to the older method
		}
	}

	// Fallback for browsers that don't support the Clipboard API
	try {
		const textArea = document.createElement("textarea");
		textArea.value = text;

		// Avoid scrolling to bottom of page in MS Edge.
		textArea.style.top = "0";
		textArea.style.left = "0";
		textArea.style.position = "fixed";

		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();

		const successful = document.execCommand("copy");
		document.body.removeChild(textArea);

		if (!successful) {
			throw new Error("Failed to copy text using fallback method.");
		}
	} catch (err) {
		return Promise.reject(err);
	}
}
