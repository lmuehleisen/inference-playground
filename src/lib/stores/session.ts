import { defaultGenerationConfig } from "$lib/components/InferencePlayground/generationConfigSettings";
import {
	defaultSystemMessage,
	FEATURED_MODELS_IDS,
} from "$lib/components/InferencePlayground/inferencePlaygroundUtils";
import type { Conversation, ConversationMessage, Session } from "$lib/components/InferencePlayground/types";

import { models } from "$lib/stores/models";
import { partialSet, safePage } from "$lib/utils/store";
import { get, writable } from "svelte/store";

export function createSessionStore() {
	let hasStarted = false;
	const store = writable<Session>();

	// Init is needed, otherwise there are stale values coming from page.
	function init() {
		const startMessageUser: ConversationMessage = { role: "user", content: "" };
		const modelIdsFromQueryParam = get(safePage)?.url?.searchParams?.get("modelId")?.split(",");
		const modelsFromQueryParam = modelIdsFromQueryParam?.map(id => get(models).find(model => model.id === id));
		const systemMessage: ConversationMessage = {
			role: "system",
			content: modelIdsFromQueryParam?.[0] ? (defaultSystemMessage?.[modelIdsFromQueryParam[0]] ?? "") : "",
		};

		store.set({
			conversations: [
				{
					model: get(models).find(m => FEATURED_MODELS_IDS.includes(m.id)) ??
						get(models)[0] ?? {
							id: "",
							downloads: 0,
							gated: false,
							likes: 0,
							name: "",
							private: false,
							tokenizerConfig: {},
							updatedAt: new Date(),
						},
					config: { ...defaultGenerationConfig },
					messages: [{ ...startMessageUser }],
					systemMessage,
					streaming: true,
				},
			],
		});

		if (modelsFromQueryParam?.length) {
			const conversations = modelsFromQueryParam.map(model => {
				return {
					model,
					config: { ...defaultGenerationConfig },
					messages: [{ ...startMessageUser }],
					systemMessage,
					streaming: true,
				};
			}) as [Conversation] | [Conversation, Conversation];
			partialSet(store, { conversations });
		}
	}

	const subscribe: (typeof store)["subscribe"] = (...args) => {
		if (!hasStarted) init();
		hasStarted = true;
		return store.subscribe(...args);
	};

	return { ...store, subscribe };
}

export const session = createSessionStore();
