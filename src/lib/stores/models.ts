import { page } from "$app/stores";
import type { ModelEntryWithTokenizer } from "$lib/components/InferencePlayground/types";
import { effect } from "$lib/utils/effect";
import { get, writable } from "svelte/store";

function createModelsStore() {
	let hasStarted = false;
	const store = writable<ModelEntryWithTokenizer[]>([]);

	function init() {
		store.set(get(page)?.data.models ?? []);
		hasStarted = true;
	}

	const subscribe: (typeof store)["subscribe"] = (...args) => {
		if (!hasStarted) init();
		hasStarted = true;
		const unsubs = [
			effect(page, $page => {
				store.set($page.data.models);
			}),
			store.subscribe(...args),
		];

		return () => {
			unsubs.forEach(unsub => unsub());
		};
	};

	return { ...store, subscribe };
}

export const models = createModelsStore();
