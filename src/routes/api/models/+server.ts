import type { Model, ModelWithTokenizer } from "$lib/types.js";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { dev } from "$app/environment";

let cache: ModelWithTokenizer[] | undefined;

const headers: HeadersInit = {
	"Upgrade-Insecure-Requests": "1",
	"Sec-Fetch-Dest": "document",
	"Sec-Fetch-Mode": "navigate",
	"Sec-Fetch-Site": "none",
	"Sec-Fetch-User": "?1",
	"Priority": "u=0, i",
	"Pragma": "no-cache",
	"Cache-Control": "no-cache",
};

const requestInit: RequestInit = {
	credentials: "include",
	headers,
	method: "GET",
	mode: "cors",
};

interface ApiQueryParams {
	pipeline_tag?: "text-generation" | "image-text-to-text";
	filter: string;
	inference_provider: string;
	limit: number;
	expand: string[];
}

const queryParams: ApiQueryParams = {
	filter: "conversational",
	inference_provider: "all",
	limit: 100,
	expand: ["inferenceProviderMapping", "config", "library_name", "pipeline_tag", "tags", "mask_token", "trendingScore"],
};

const baseUrl = "https://huggingface.co/api/models";

function buildApiUrl(params: ApiQueryParams): string {
	const url = new URL(baseUrl);
	// Add simple params
	Object.entries(params).forEach(([key, value]) => {
		if (!Array.isArray(value)) {
			url.searchParams.append(key, String(value));
		}
	});
	// Handle array params specially
	params.expand.forEach(item => {
		url.searchParams.append("expand[]", item);
	});
	return url.toString();
}

export const GET: RequestHandler = async ({ fetch }) => {
	if (cache?.length && dev) {
		console.log("Skipping load, using in memory cache");
		return json(cache);
	}

	try {
		// Fetch both types of models in parallel
		const textGenPromise = fetch(buildApiUrl({ ...queryParams, pipeline_tag: "text-generation" }), requestInit);
		const imgText2TextPromise = fetch(buildApiUrl({ ...queryParams, pipeline_tag: "image-text-to-text" }), requestInit);
		const [textGenResponse, imgText2TextResponse] = await Promise.all([textGenPromise, imgText2TextPromise]);

		if (!textGenResponse.ok) {
			console.error(`Error fetching text-generation models`, textGenResponse.status, textGenResponse.statusText);
		}

		if (!imgText2TextResponse.ok) {
			console.error(
				`Error fetching image-text-to-text models`,
				imgText2TextResponse.status,
				imgText2TextResponse.statusText
			);
		}

		// Parse the responses
		const textGenModels: Model[] = textGenResponse.ok ? await textGenResponse.json() : [];
		const imgText2TextModels: Model[] = imgText2TextResponse.ok ? await imgText2TextResponse.json() : [];

		// Combine the models
		const compatibleModels: Model[] = [...textGenModels, ...imgText2TextModels];

		// Sort the models
		compatibleModels.sort((a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase()));

		// Fetch tokenizer configs for each model
		const promises = compatibleModels.map(async model => {
			const configUrl = `https://huggingface.co/${model.id}/raw/main/tokenizer_config.json`;
			const res = await fetch(configUrl, {
				credentials: "include",
				headers,
				method: "GET",
				mode: "cors",
			});

			if (!res.ok) {
				// console.error(`Error fetching tokenizer file for ${model.id}`, res.status, res.statusText);
				return null; // Ignore failed requests by returning null
			}

			const tokenizerConfig = await res.json();
			return { ...model, tokenizerConfig } satisfies ModelWithTokenizer;
		});

		const models: ModelWithTokenizer[] = (await Promise.all(promises)).filter(
			(model): model is ModelWithTokenizer => model !== null
		);
		cache = models;

		return json(cache);
	} catch (error) {
		console.error("Error fetching models:", error);
		return json([]);
	}
};
