import type { ModelEntryWithTokenizer } from "$lib/components/InferencePlayground/types";
import type { ModelEntry } from "@huggingface/hub";
import type { PageServerLoad } from "./$types";
import { env } from "$env/dynamic/private";

export const load: PageServerLoad = async ({ fetch }) => {
	const apiUrl = "https://huggingface.co/api/models?pipeline_tag=text-generation&inference=Warm&filter=conversational";
	const HF_TOKEN = env.HF_TOKEN;

	const res = await fetch(apiUrl, {
		headers: {
			Authorization: `Bearer ${HF_TOKEN}`,
		},
	});
	const compatibleModels: ModelEntry[] = await res.json();
	compatibleModels.sort((a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase()));

	const promises = compatibleModels.map(async model => {
		const configUrl = `https://huggingface.co/${model.id}/raw/main/tokenizer_config.json`;
		const res = await fetch(configUrl);
		if (!res.ok) {
			return null; // Ignore failed requests by returning null
		}
		const tokenizerConfig = await res.json();
		return { ...model, tokenizerConfig } satisfies ModelEntryWithTokenizer;
	});

	const models: ModelEntryWithTokenizer[] = (await Promise.all(promises)).filter(model => model !== null);

	return { models };
};
