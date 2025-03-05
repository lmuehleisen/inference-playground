import { browser } from "$app/environment";
import { page } from "$app/stores";
import { readable, type Writable } from "svelte/store";

export function partialSet<T extends Record<string, unknown>>(store: Writable<T>, partial: Partial<T>) {
	store.update(s => ({ ...s, ...partial }));
}

export const safePage = browser ? page : readable(undefined);
