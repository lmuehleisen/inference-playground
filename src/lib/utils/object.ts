// typed Object.keys
export function keys<T extends object>(o: T): (keyof T)[] {
	return Object.keys(o) as (keyof T)[];
}

// typed Object.entries
export function entries<T extends object>(o: T): [keyof T, T[keyof T]][] {
	return Object.entries(o) as [keyof T, T[keyof T]][];
}

// typed Object.fromEntries
export function fromEntries<T extends object>(entries: [keyof T, T[keyof T]][]): T {
	return Object.fromEntries(entries) as T;
}
