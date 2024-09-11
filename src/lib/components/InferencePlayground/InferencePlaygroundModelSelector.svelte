<script lang="ts">
	import type { Conversation, ModelEntryWithTokenizer } from "./types";

	import { goto } from "$app/navigation";
	import { page } from "$app/stores";

	import IconCaret from "../Icons/IconCaret.svelte";
	import ModelSelectorModal from "./InferencePlaygroundModelSelectorModal.svelte";

	export let models: ModelEntryWithTokenizer[] = [];
	export let conversation: Conversation;

	let showModelPickerModal = false;

	async function getAvatarUrl(orgName: string) {
		const url = `https://huggingface.co/api/organizations/${orgName}/avatar`;
		const res = await fetch(url);
		if (!res.ok) {
			console.error(`Error getting avatar url for org: ${orgName}`, res.status, res.statusText);
			return;
		}
		const json = await res.json();
		const { avatarUrl } = json;
		return avatarUrl;
	}

	function changeModel(modelId: ModelEntryWithTokenizer["id"]) {
		const model = models.find(m => m.id === modelId);
		if (!model) {
			return;
		}
		conversation.model = model;

		const url = new URL($page.url);
		url.searchParams.set("modelId", model.id);
		goto(url.toString(), { replaceState: true });
	}

	$: [nameSpace, modelName] = conversation.model.id.split("/");
</script>

{#if showModelPickerModal}
	<ModelSelectorModal
		{models}
		{conversation}
		on:modelSelected={e => changeModel(e.detail)}
		on:close={e => (showModelPickerModal = false)}
	/>
{/if}

<div class="flex flex-col gap-2">
	<label for="countries" class="flex items-baseline text-sm font-medium text-gray-900 dark:text-white"
		>Models<span class="ml-4 font-normal text-gray-400">{models.length}</span>
	</label>

	<button
		class="flex items-center justify-between relative gap-6 overflow-hidden whitespace-nowrap hover:brightness-95 dark:hover:brightness-110 rounded-lg border bg-gray-100/80 px-3 py-1.5 leading-tight shadow dark:border-gray-700 dark:bg-gray-800"
		on:click={() => (showModelPickerModal = true)}
	>
		<div class="flex flex-col items-start">
			<div class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-300">
				{#await getAvatarUrl(nameSpace) then avatarUrl}
					<img class="size-3 flex-none rounded bg-gray-200 object-cover" src={avatarUrl} alt="{nameSpace} avatar" />
				{/await}
				{nameSpace}
			</div>
			<div>{modelName}</div>
		</div>
		<IconCaret classNames="text-xl bg-gray-100 dark:bg-gray-600 rounded size-4 flex-none absolute right-2" />
	</button>
</div>
