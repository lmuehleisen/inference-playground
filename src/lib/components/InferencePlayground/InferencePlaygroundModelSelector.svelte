<script lang="ts">
	import type { Conversation, ModelEntryWithTokenizer } from '$lib/types';

	export let models: ModelEntryWithTokenizer[] = [];
	export let conversation: Conversation;
	export let disabled = false;

	$: [nameSpace, modelName] = conversation.model.id.split('/');
</script>

<div class="flex flex-col gap-2">
	<label
		for="countries"
		class="flex items-baseline text-sm font-medium text-gray-900 dark:text-white"
		>Models<span class="ml-4 font-normal text-gray-400">{models.length}</span>
	</label>

	<button
		class="flex items-center gap-6 overflow-hidden whitespace-nowrap rounded-lg border bg-gray-100/80 px-3 py-1.5 leading-tight shadow dark:bg-gray-700"
		on:click
	>
		<div class="flex flex-col items-start">
			<div class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-300">
				<img
					class="size-3 flex-none rounded bg-gray-200 object-cover"
					src="https://cdn-avatars.huggingface.co/v1/production/uploads/646cf8084eefb026fb8fd8bc/oCTqufkdTkjyGodsx1vo1.png"
					alt=""
				/>
				{nameSpace}
			</div>
			<div>{modelName}</div>
		</div>
		<div class="rounded bg-gray-100">
			<svg
				class="text-xl"
				xmlns="http://www.w3.org/2000/svg"
				width="1em"
				height="1em"
				viewBox="0 0 24 24"
				><path fill="currentColor" d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6l-6-6z" /></svg
			>
		</div>
	</button>
</div>
