import type { ModelEntryWithTokenizer } from "$lib/components/InferencePlayground/types";
import { safePage } from "$lib/utils/store";
import { derived } from "svelte/store";

export const models = derived(safePage, $page => {
	const res: ModelEntryWithTokenizer[] = $page?.data?.models ?? [];
	return res;
});
