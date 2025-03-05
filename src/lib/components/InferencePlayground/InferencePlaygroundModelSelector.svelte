<script lang="ts">
	import type { Conversation, ModelEntryWithTokenizer } from "./types";

	import { goto } from "$app/navigation";
	import { page } from "$app/stores";

	import { fetchHuggingFaceModel, type InferenceProviderMapping } from "$lib/fetchers/providers";
	import { models } from "$lib/stores/models";
	import { token } from "$lib/stores/token";
	import Avatar from "../Avatar.svelte";
	import IconCaret from "../Icons/IconCaret.svelte";
	import ModelSelectorModal from "./InferencePlaygroundModelSelectorModal.svelte";
	import { defaultSystemMessage } from "./inferencePlaygroundUtils";

	export let conversation: Conversation;

	let showModelPickerModal = false;

	function changeModel(modelId: ModelEntryWithTokenizer["id"]) {
		const model = $models.find(m => m.id === modelId);
		if (!model) {
			return;
		}
		conversation.model = model;
		conversation.systemMessage = { role: "system", content: defaultSystemMessage?.[modelId] ?? "" };

		const url = new URL($page.url);
		url.searchParams.set("modelId", model.id);

		const parentOrigin = "https://huggingface.co";
		window.parent.postMessage({ queryString: `modelId=${model.id}` }, parentOrigin);

		goto(url.toString(), { replaceState: true });
	}

	$: nameSpace = conversation.model.id.split("/")[0] ?? "";
	$: modelName = conversation.model.id.split("/")[1] ?? "";

	async function loadProviders(modelId: string) {
		providerMap = {};
		const res = await fetchHuggingFaceModel(modelId, $token.value);
		providerMap = res.inferenceProviderMapping;
	}
	let providerMap: InferenceProviderMapping = {};
	// $: loadProviders(conversation.model.id);

	const id = crypto.randomUUID();
</script>

{#if showModelPickerModal}
	<ModelSelectorModal
		{conversation}
		on:modelSelected={e => changeModel(e.detail)}
		on:close={() => (showModelPickerModal = false)}
	/>
{/if}

<div class="flex flex-col gap-2">
	<label for={id} class="flex items-baseline gap-2 text-sm font-medium text-gray-900 dark:text-white">
		Models<span class="text-xs font-normal text-gray-400">{$models.length}</span>
	</label>

	<button
		{id}
		class="relative flex items-center justify-between gap-6 overflow-hidden rounded-lg border bg-gray-100/80 px-3 py-1.5 leading-tight whitespace-nowrap shadow-sm hover:brightness-95 dark:border-gray-700 dark:bg-gray-800 dark:hover:brightness-110"
		on:click={() => (showModelPickerModal = true)}
	>
		<div class="flex flex-col items-start">
			<div class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-300">
				<Avatar orgName={nameSpace} size="sm" />
				{nameSpace}
			</div>
			<div>{modelName}</div>
		</div>
		<IconCaret classNames="text-xl bg-gray-100 dark:bg-gray-600 rounded-sm size-4 flex-none absolute right-2" />
	</button>
</div>

<div class="flex flex-col gap-2">
	<label for={id} class="flex items-baseline gap-2 text-sm font-medium text-gray-900 dark:text-white">
		Providers<span class="text-xs font-normal text-gray-400"></span>
	</label>

	<button
		{id}
		class="relative flex items-center justify-between gap-6 overflow-hidden rounded-lg border bg-gray-100/80 px-3 py-1.5 leading-tight whitespace-nowrap shadow-sm hover:brightness-95 dark:border-gray-700 dark:bg-gray-800 dark:hover:brightness-110"
		on:click={() => (showModelPickerModal = true)}
	>
		<div class="flex flex-col items-start">
			<div class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-300">
				<Avatar orgName={nameSpace} size="sm" />
				{nameSpace}
			</div>
			<div>{modelName}</div>
		</div>
		<IconCaret classNames="text-xl bg-gray-100 dark:bg-gray-600 rounded-sm size-4 flex-none absolute right-2" />
	</button>
</div>
