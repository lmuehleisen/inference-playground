import { page } from "$app/stores";
import type { ModelEntryWithTokenizer } from "$lib/components/InferencePlayground/types";
import { derived } from "svelte/store";

export const models = derived(page, $page => $page.data.models as ModelEntryWithTokenizer[]);
