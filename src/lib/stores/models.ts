import { page } from "$app/stores";
import type { ModelWithTokenizer } from "$lib/types";
import { readable } from "svelte/store";

export const models = readable<ModelWithTokenizer[]>(undefined, set => {
	const unsub = page.subscribe($p => set($p.data?.models));
	return unsub;
});
