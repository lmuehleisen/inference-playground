export function safeParse(str: string): any {
	try {
		return JSON.parse(str);
	} catch {
		return null;
	}
}
