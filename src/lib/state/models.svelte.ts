import { page } from "$app/state";
import type { ModelWithTokenizer } from "$lib/types.js";

class Models {
	$ = $derived(page.data.models as ModelWithTokenizer[]);
}

export const models = new Models();
