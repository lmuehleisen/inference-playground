import { page } from "$app/stores";
import type { ModelEntryWithTokenizer } from "$lib/components/InferencePlayground/types";
import { readable } from "svelte/store";

export const models = readable<ModelEntryWithTokenizer[]>(undefined, set => {
	const unsub = page.subscribe($p => set($p.data.models));
	return unsub;
});
