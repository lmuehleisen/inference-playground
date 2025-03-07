<script lang="ts">
	import type { Conversation, ModelWithTokenizer } from "$lib/types";

	import { createEventDispatcher } from "svelte";

	import { models } from "$lib/stores/models";
	import Avatar from "../Avatar.svelte";
	import IconCog from "../Icons/IconCog.svelte";
	import GenerationConfig from "./InferencePlaygroundGenerationConfig.svelte";
	import ModelSelectorModal from "./InferencePlaygroundModelSelectorModal.svelte";
	import InferencePlaygroundProviderSelect from "./InferencePlaygroundProviderSelect.svelte";

	export let conversation: Conversation;
	export let conversationIdx: number;

	const dispatch = createEventDispatcher<{ close: string }>();

	let modelSelectorOpen = false;

	function changeModel(newModelId: ModelWithTokenizer["id"]) {
		const model = $models.find(m => m.id === newModelId);
		if (!model) {
			return;
		}
		conversation.model = model;
		conversation.provider = undefined;
	}

	$: nameSpace = conversation.model.id.split("/")[0] ?? "";
</script>

{#if modelSelectorOpen}
	<ModelSelectorModal
		{conversation}
		on:modelSelected={e => changeModel(e.detail)}
		on:close={() => (modelSelectorOpen = false)}
	/>
{/if}

<div
	class="{conversationIdx === 0
		? 'mr-4 max-sm:ml-4'
		: 'mx-4'} flex h-11 flex-none items-center gap-2 rounded-lg border border-gray-200/80 bg-white pr-2 pl-3 text-sm leading-none whitespace-nowrap shadow-xs *:flex-none max-sm:mt-4 dark:border-white/5 dark:bg-gray-800/70 dark:hover:bg-gray-800"
>
	<Avatar orgName={nameSpace} size="md" />
	<button class="flex-1! self-stretch text-left hover:underline" on:click={() => (modelSelectorOpen = true)}
		>{conversation.model.id}</button
	>
	<button
		class="borderdark:border-white/5 flex size-6 items-center justify-center rounded-sm bg-gray-50 text-xs hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
		on:click={() => dispatch("close", conversation.model.id)}
	>
		✕
	</button>
	<button
		class="borderdark:border-white/5 group relative flex size-6 items-center justify-center rounded-sm bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
	>
		<IconCog />
		<GenerationConfig
			bind:conversation
			classNames="absolute top-7 min-w-[250px] z-10 right-3 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hidden group-focus:flex hover:flex"
		/>
	</button>
</div>

<div
	class="{conversationIdx === 0
		? 'mr-4 max-sm:ml-4'
		: 'mx-4'}  mt-2 h-11 text-sm leading-none whitespace-nowrap max-sm:mt-4"
>
	<InferencePlaygroundProviderSelect
		bind:conversation
		class="rounded-lg border border-gray-200/80 bg-white dark:border-white/5 dark:bg-gray-800/70 dark:hover:bg-gray-800"
	/>
</div>
