import type { ModelWithTokenizer } from "$lib/types.js";

export function getTrending(models: ModelWithTokenizer[], limit = 5) {
	return models.toSorted((a, b) => b.trendingScore - a.trendingScore).slice(0, limit);
}
