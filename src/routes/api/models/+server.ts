import type { Model, ModelWithTokenizer } from "$lib/types.js";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

enum CacheStatus {
	SUCCESS = "success",
	PARTIAL = "partial",
	ERROR = "error",
}

type Cache = {
	data: ModelWithTokenizer[] | undefined;
	timestamp: number;
	status: CacheStatus;
	// Track failed models to selectively refetch them
	failedTokenizers: string[]; // Using array instead of Set for serialization compatibility
	failedApiCalls: {
		textGeneration: boolean;
		imageTextToText: boolean;
	};
};

const cache: Cache = {
	data: undefined,
	timestamp: 0,
	status: CacheStatus.ERROR,
	failedTokenizers: [],
	failedApiCalls: {
		textGeneration: false,
		imageTextToText: false,
	},
};

// The time between cache refreshes
const FULL_CACHE_REFRESH = 1000 * 60 * 60; // 1 hour
const PARTIAL_CACHE_REFRESH = 1000 * 60 * 15; // 15 minutes (shorter for partial results)

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
	const timestamp = Date.now();

	// Determine if cache is valid
	const elapsed = timestamp - cache.timestamp;
	const cacheRefreshTime = cache.status === CacheStatus.SUCCESS ? FULL_CACHE_REFRESH : PARTIAL_CACHE_REFRESH;

	// Use cache if it's still valid and has data
	if (elapsed < cacheRefreshTime && cache.data?.length) {
		console.log(`Using ${cache.status} cache (${Math.floor(elapsed / 1000 / 60)} min old)`);
		return json(cache.data);
	}

	try {
		// Determine which API calls we need to make based on cache status
		const needTextGenFetch = elapsed >= FULL_CACHE_REFRESH || cache.failedApiCalls.textGeneration;
		const needImgTextFetch = elapsed >= FULL_CACHE_REFRESH || cache.failedApiCalls.imageTextToText;

		// Track the existing models we'll keep
		const existingModels = new Map<string, ModelWithTokenizer>();
		if (cache.data) {
			cache.data.forEach(model => {
				existingModels.set(model.id, model);
			});
		}

		// Initialize new tracking for failed requests
		const newFailedTokenizers: string[] = [];
		const newFailedApiCalls = {
			textGeneration: false,
			imageTextToText: false,
		};

		// Fetch models as needed
		let textGenModels: Model[] = [];
		let imgText2TextModels: Model[] = [];

		// Make the needed API calls in parallel
		const apiPromises: Promise<Response | void>[] = [];
		if (needTextGenFetch) {
			apiPromises.push(
				fetch(buildApiUrl({ ...queryParams, pipeline_tag: "text-generation" }), requestInit).then(async response => {
					if (!response.ok) {
						console.error(`Error fetching text-generation models`, response.status, response.statusText);
						newFailedApiCalls.textGeneration = true;
					} else {
						textGenModels = await response.json();
					}
				})
			);
		}

		if (needImgTextFetch) {
			apiPromises.push(
				fetch(buildApiUrl({ ...queryParams, pipeline_tag: "image-text-to-text" }), requestInit).then(async response => {
					if (!response.ok) {
						console.error(`Error fetching image-text-to-text models`, response.status, response.statusText);
						newFailedApiCalls.imageTextToText = true;
					} else {
						imgText2TextModels = await response.json();
					}
				})
			);
		}

		await Promise.all(apiPromises);

		// If both needed API calls failed and we have cached data, use it
		if (
			needTextGenFetch &&
			newFailedApiCalls.textGeneration &&
			needImgTextFetch &&
			newFailedApiCalls.imageTextToText &&
			cache.data?.length
		) {
			console.log("All API requests failed. Using existing cache as fallback.");
			cache.status = CacheStatus.ERROR;
			cache.timestamp = timestamp; // Update timestamp to avoid rapid retry loops
			cache.failedApiCalls = newFailedApiCalls;
			return json(cache.data);
		}

		// For API calls we didn't need to make, use cached models
		if (!needTextGenFetch && cache.data) {
			textGenModels = cache.data.filter(model => model.pipeline_tag === "text-generation").map(model => model as Model);
		}

		if (!needImgTextFetch && cache.data) {
			imgText2TextModels = cache.data
				.filter(model => model.pipeline_tag === "image-text-to-text")
				.map(model => model as Model);
		}

		const allModels: Model[] = [...textGenModels, ...imgText2TextModels];

		const modelsNeedingTokenizer: Model[] = [];

		// First, use existing model data when possible
		allModels.forEach(model => {
			const existingModel = existingModels.get(model.id);

			// Only fetch tokenizer if:
			// 1. We don't have this model yet, OR
			// 2. It's in our failed tokenizers list AND we're doing a refresh, OR
			// 3. We're doing a full refresh
			if (
				!existingModel ||
				(cache.failedTokenizers.includes(model.id) && elapsed >= PARTIAL_CACHE_REFRESH) ||
				elapsed >= FULL_CACHE_REFRESH
			) {
				modelsNeedingTokenizer.push(model);
			}
		});

		console.log(`Total models: ${allModels.length}, Models needing tokenizer fetch: ${modelsNeedingTokenizer.length}`);

		// Prepare result - start with existing models we want to keep
		const models: ModelWithTokenizer[] = [];

		// Add models we're not re-fetching tokenizers for
		allModels.forEach(model => {
			const existingModel = existingModels.get(model.id);
			if (existingModel && !modelsNeedingTokenizer.some(m => m.id === model.id)) {
				models.push(existingModel);
			}
		});

		// Fetch tokenizer configs only for models that need it, with concurrency limit
		const batchSize = 10; // Limit concurrent requests

		for (let i = 0; i < modelsNeedingTokenizer.length; i += batchSize) {
			const batch = modelsNeedingTokenizer.slice(i, i + batchSize);
			const batchPromises = batch.map(async model => {
				try {
					const configUrl = `https://huggingface.co/${model.id}/raw/main/tokenizer_config.json`;
					const res = await fetch(configUrl, {
						credentials: "include",
						headers,
						method: "GET",
						mode: "cors",
					});

					if (!res.ok) {
						if (!newFailedTokenizers.includes(model.id)) {
							newFailedTokenizers.push(model.id);
						}
						return null;
					}

					const tokenizerConfig = await res.json();
					return { ...model, tokenizerConfig } satisfies ModelWithTokenizer;
				} catch (error) {
					console.error(`Error processing tokenizer for ${model.id}:`, error);
					if (!newFailedTokenizers.includes(model.id)) {
						newFailedTokenizers.push(model.id);
					}
					return null;
				}
			});

			const batchResults = await Promise.all(batchPromises);
			models.push(...batchResults.filter((model): model is ModelWithTokenizer => model !== null));
		}

		models.sort((a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase()));

		// Determine cache status based on failures
		const hasApiFailures = newFailedApiCalls.textGeneration || newFailedApiCalls.imageTextToText;
		const hasSignificantTokenizerFailures = newFailedTokenizers.length > modelsNeedingTokenizer.length * 0.2;

		const cacheStatus = hasApiFailures || hasSignificantTokenizerFailures ? CacheStatus.PARTIAL : CacheStatus.SUCCESS;

		cache.data = models;
		cache.timestamp = timestamp;
		cache.status = cacheStatus;
		cache.failedTokenizers = newFailedTokenizers;
		cache.failedApiCalls = newFailedApiCalls;

		console.log(
			`Cache updated: ${models.length} models, status: ${cacheStatus}, ` +
				`failed tokenizers: ${newFailedTokenizers.length}, ` +
				`API failures: text=${newFailedApiCalls.textGeneration}, img=${newFailedApiCalls.imageTextToText}`
		);

		return json(models);
	} catch (error) {
		console.error("Error fetching models:", error);

		// If we have cached data, use it as fallback
		if (cache.data?.length) {
			cache.status = CacheStatus.ERROR;
			// Mark all API calls as failed so we retry them next time
			cache.failedApiCalls = {
				textGeneration: true,
				imageTextToText: true,
			};
			return json(cache.data);
		}

		// No cache available, return empty array
		cache.status = CacheStatus.ERROR;
		cache.timestamp = timestamp;
		cache.failedApiCalls = {
			textGeneration: true,
			imageTextToText: true,
		};
		return json([]);
	}
};
