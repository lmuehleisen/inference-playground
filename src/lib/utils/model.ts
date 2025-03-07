import type { Model, ModelWithTokenizer } from "$lib/types";

export function getTrending(models: ModelWithTokenizer[], limit = 5) {
	return models.toSorted((a, b) => b.trendingScore - a.trendingScore).slice(0, limit);
}
