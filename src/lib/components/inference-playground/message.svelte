<script lang="ts">
	import { TextareaAutosize } from "$lib/spells/textarea-autosize.svelte.js";
	import type { ConversationMessage } from "$lib/types.js";
	import Tooltip from "$lib/components/tooltip.svelte";
	import IconImage from "~icons/carbon/image-reference";

	type Props = {
		content: ConversationMessage["content"];
		role: ConversationMessage["role"];
		loading?: boolean;
		autofocus?: boolean;
		onDelete?: () => void;
	};

	let { content = $bindable(""), role, loading, autofocus, onDelete }: Props = $props();

	let element = $state<HTMLTextAreaElement>();
	new TextareaAutosize({
		element: () => element,
		input: () => content,
	});
</script>

<div
	class="group/message group flex flex-col items-start gap-x-4 gap-y-2 border-b px-3.5 pt-4 pb-6 hover:bg-gray-100/70
	@2xl:flex-row @2xl:px-6 dark:border-gray-800 dark:hover:bg-gray-800/30"
	class:pointer-events-none={loading}
>
	<div class="pt-3 text-sm font-semibold uppercase @2xl:basis-[130px]">
		{role}
	</div>
	<div class="flex w-full items-center gap-4">
		<!-- svelte-ignore a11y_autofocus -->
		<!-- svelte-ignore a11y_positive_tabindex -->
		<textarea
			bind:this={element}
			{autofocus}
			bind:value={content}
			placeholder="Enter {role} message"
			class="grow resize-none overflow-hidden rounded-lg bg-transparent px-2 py-2.5 ring-gray-100 outline-none group-hover/message:ring-3 hover:bg-white focus:bg-white focus:ring-3 @2xl:px-3 dark:ring-gray-600 dark:hover:bg-gray-900 dark:focus:bg-gray-900"
			rows="1"
			tabindex="2"
		></textarea>

		<Tooltip openDelay={250}>
			{#snippet trigger(tooltip)}
				<button
					tabindex="0"
					onclick={onDelete}
					type="button"
					class="grid size-8 place-items-center rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-900
			group-focus-within/message:visible group-hover/message:visible hover:bg-gray-100
			hover:text-blue-700 focus:z-10 focus:ring-4
			focus:ring-gray-100 focus:outline-hidden sm:invisible dark:border-gray-600 dark:bg-gray-800
			dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
					{...tooltip.trigger}
				>
					<IconImage />
				</button>
			{/snippet}
			Add image
		</Tooltip>

		<Tooltip>
			{#snippet trigger(tooltip)}
				<button
					tabindex="0"
					onclick={onDelete}
					type="button"
					class="size-8 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-900
			group-focus-within/message:visible group-hover/message:visible hover:bg-gray-100
			hover:text-blue-700 focus:z-10 focus:ring-4
			focus:ring-gray-100 focus:outline-hidden sm:invisible dark:border-gray-600 dark:bg-gray-800
			dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
					{...tooltip.trigger}
				>
					✕
				</button>
			{/snippet}
			Delete
		</Tooltip>
	</div>
</div>
