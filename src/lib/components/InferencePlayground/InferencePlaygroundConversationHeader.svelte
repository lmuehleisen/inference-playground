<script lang="ts">
	import type { Conversation, ModelEntryWithTokenizer } from "$lib/components/InferencePlayground/types";

	import { createEventDispatcher } from "svelte";

	import { page } from "$app/stores";
	import IconCog from "../Icons/IconCog.svelte";
	import GenerationConfig from "./InferencePlaygroundGenerationConfig.svelte";
	import ModelSelectorModal from "./InferencePlaygroundModelSelectorModal.svelte";
	import Avatar from "../Avatar.svelte";
	import { goto } from "$app/navigation";

	export let models: ModelEntryWithTokenizer[];
	export let conversation: Conversation;
	export let conversationIdx: number;

	const dispatch = createEventDispatcher<{ close: string }>();

	let modelSelectorOpen = false;

	function changeModel(newModelId: ModelEntryWithTokenizer["id"]) {
		const model = models.find(m => m.id === newModelId);
		if (!model) {
			return;
		}
		conversation.model = model;

		const url = new URL($page.url);
		const queryParamValue = url.searchParams.get("modelId");
		if (queryParamValue) {
			const modelIds = queryParamValue.split(",") as [string, string];
			modelIds[conversationIdx] = newModelId;

			const newQueryParamValue = modelIds.join(",");
			url.searchParams.set("modelId", newQueryParamValue);

			const parentOrigin = "https://huggingface.co";
			window.parent.postMessage({ queryString: `modelId=${newQueryParamValue}` }, parentOrigin);

			goto(url.toString(), { replaceState: true });
		}
	}

	$: [nameSpace] = conversation.model.id.split("/");
</script>

{#if modelSelectorOpen}
	<ModelSelectorModal
		{models}
		{conversation}
		on:modelSelected={e => changeModel(e.detail)}
		on:close={() => (modelSelectorOpen = false)}
	/>
{/if}

<div
	class="{conversationIdx === 0
		? 'mr-4'
		: 'mx-4'} flex h-11 flex-none items-center gap-2 whitespace-nowrap rounded-lg border border-gray-200/80 bg-white pl-3 pr-2 text-sm leading-none shadow-sm *:flex-none dark:border-gray-800 dark:bg-gray-800/70 dark:hover:bg-gray-800"
>
	<Avatar orgName={nameSpace} size="sm" />
	<button on:click={() => (modelSelectorOpen = true)}>{conversation.model.id}</button>
	<button
		class="ml-auto flex size-6 items-center justify-center rounded bg-gray-50 text-xs hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
		on:click={() => dispatch("close", conversation.model.id)}
	>
		✕
	</button>
	<button
		class="group relative flex size-6 items-center justify-center rounded bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
	>
		<IconCog />
		<GenerationConfig
			bind:conversation
			classNames="absolute top-7 min-w-[250px] z-10 right-3 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-600 hidden group-focus:flex hover:flex"
		/>
	</button>
</div>
