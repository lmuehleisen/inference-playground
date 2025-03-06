<script lang="ts">
	import type { Conversation, ModelEntryWithTokenizer } from "./types";

	import { goto } from "$app/navigation";
	import { page } from "$app/stores";

	import { browser } from "$app/environment";
	import { fetchHuggingFaceModel, type InferenceProviderMapping } from "$lib/fetchers/providers";
	import { models } from "$lib/stores/models";
	import { token } from "$lib/stores/token";
	import { randomPick } from "$lib/utils/array";
	import Avatar from "../Avatar.svelte";
	import IconCaret from "../Icons/IconCaret.svelte";
	import IconProvider from "../Icons/IconProvider.svelte";
	import ModelSelectorModal from "./InferencePlaygroundModelSelectorModal.svelte";
	import { defaultSystemMessage } from "./inferencePlaygroundUtils";
	import { createSelect, createSync } from "@melt-ui/svelte";

	export let conversation: Conversation;

	let showModelPickerModal = false;

	// Model
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
	const id = crypto.randomUUID();

	// Provider
	async function loadProviders(modelId: string) {
		if (!browser) return;
		providerMap = {};
		const res = await fetchHuggingFaceModel(modelId, $token.value);
		providerMap = res.inferenceProviderMapping;
		if (conversation.provider ?? "" in providerMap) return;
		conversation.provider = randomPick(Object.keys(providerMap));
	}

	let providerMap: InferenceProviderMapping = {};
	$: modelId = conversation.model.id;
	$: loadProviders(modelId);
	$: provider = conversation.provider;

	const {
		elements: { trigger, menu, option },
		states: { selected },
	} = createSelect<string, false>();
	const sync = createSync({ selected });
	$: sync.selected(
		conversation.provider ? { value: conversation.provider } : undefined,
		p => (conversation.provider = p?.value)
	);
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
		<IconCaret classNames="text-xl bg-gray-100 dark:bg-gray-600 rounded-sm size-4 flex-none absolute right-2" />
	</button>
</div>

{#if showModelPickerModal}
	<ModelSelectorModal
		{conversation}
		on:modelSelected={e => changeModel(e.detail)}
		on:close={() => (showModelPickerModal = false)}
	/>
{/if}

<div class="flex flex-col gap-2">
	<!--
	<label class="flex items-baseline gap-2 text-sm font-medium text-gray-900 dark:text-white">
		Providers<span class="text-xs font-normal text-gray-400"></span>
	</label>
	-->

	<button
		{...$trigger}
		use:trigger
		class="relative flex items-center justify-between gap-6 overflow-hidden rounded-lg border bg-gray-100/80 px-3 py-1.5 leading-tight whitespace-nowrap shadow-sm hover:brightness-95 dark:border-gray-700 dark:bg-gray-800 dark:hover:brightness-110"
	>
		<div class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-300">
			<IconProvider provider={conversation.provider} />
			{conversation.provider ?? "loading"}
		</div>
		<IconCaret classNames="text-xl bg-gray-100 dark:bg-gray-600 rounded-sm size-4 flex-none absolute right-2" />
	</button>

	<div {...$menu} use:menu class="rounded-lg border bg-gray-100/80 dark:border-gray-700 dark:bg-gray-800">
		{#each Object.keys(providerMap) as provider (provider)}
			<div {...$option({ value: provider })} use:option class="group p-1 text-sm dark:text-white">
				<div
					class="flex items-center gap-2 rounded-md px-2 py-1 group-data-[highlighted]:bg-gray-200 dark:group-data-[highlighted]:bg-gray-700"
				>
					<IconProvider {provider} />
					{provider}
				</div>
			</div>
		{/each}
	</div>
</div>
