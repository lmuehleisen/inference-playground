<script lang="ts">
	import type { Conversation, ModelWithTokenizer } from "$lib/types.js";

	import { models } from "$lib/stores/models.js";
	import IconCaret from "~icons/carbon/chevron-down";
	import Avatar from "../Avatar.svelte";
	import ModelSelectorModal from "./InferencePlaygroundModelSelectorModal.svelte";
	import ProviderSelect from "./provider-select.svelte";
	import { defaultSystemMessage } from "./inferencePlaygroundUtils.js";

	export let conversation: Conversation;

	let showModelPickerModal = false;

	// Model
	function changeModel(modelId: ModelWithTokenizer["id"]) {
		const model = $models.find(m => m.id === modelId);
		if (!model) {
			return;
		}
		conversation.model = model;
		conversation.systemMessage = { role: "system", content: defaultSystemMessage?.[modelId] ?? "" };
		conversation.provider = undefined;
	}

	$: nameSpace = conversation.model.id.split("/")[0] ?? "";
	$: modelName = conversation.model.id.split("/")[1] ?? "";
	const id = crypto.randomUUID();
</script>

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
		<div
			class="absolute right-2 grid size-4 flex-none place-items-center rounded-sm bg-gray-100 text-xs dark:bg-gray-600"
		>
			<IconCaret />
		</div>
	</button>
</div>

{#if showModelPickerModal}
	<ModelSelectorModal
		{conversation}
		on:modelSelected={e => changeModel(e.detail)}
		on:close={() => (showModelPickerModal = false)}
	/>
{/if}

<ProviderSelect bind:conversation />
