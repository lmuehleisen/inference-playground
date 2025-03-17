import { page } from "$app/state";
import type { ModelWithTokenizer } from "$lib/types.js";

class Models {
	all = $derived(page.data.models as ModelWithTokenizer[]);
	trending = $derived(this.all.toSorted((a, b) => b.trendingScore - a.trendingScore).slice(0, 5));
}

export const models = new Models();
