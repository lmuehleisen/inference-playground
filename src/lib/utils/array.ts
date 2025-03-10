export function last<T>(arr: T[]): T | undefined {
	return arr[arr.length - 1];
}

export function randomPick<T>(arr: T[]): T | undefined {
	return arr[Math.floor(Math.random() * arr.length)];
}
