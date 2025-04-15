export function last<T>(arr: T[]): T | undefined {
	return arr[arr.length - 1];
}

export function randomPick<T>(arr: T[]): T | undefined {
	return arr[Math.floor(Math.random() * arr.length)];
}

/** Return an array with an edited element at the given index. */
export function edit<T>(arr: T[], index: number, newValue: T): T[] {
	return arr.map((value, i) => (i === index ? newValue : value));
}
