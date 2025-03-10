import { onMount } from "svelte";
import { readonly, writable } from "svelte/store";

export function isMounted() {
	const store = writable(false);
	onMount(() => store.set(true));

	return readonly(store);
}
