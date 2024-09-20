<script lang="ts">
	import { type ChatCompletionInputMessage } from "@huggingface/tasks";
	import { createEventDispatcher } from "svelte";

	export let message: ChatCompletionInputMessage;
	export let loading: boolean = false;
	export let autofocus: boolean = false;

	const dispatch = createEventDispatcher<{ delete: void; input: void }>();
</script>

<div
	class="group/message group grid grid-cols-[1fr,2.5rem] items-start gap-2 px-3.5 pb-6 pt-4 hover:bg-gray-100/70 @2xl:grid-cols-[130px,1fr,2.5rem] @2xl:grid-rows-1 @2xl:gap-4 @2xl:px-6 dark:border-gray-800 dark:hover:bg-gray-800/30 {$$props.class}"
	class:pointer-events-none={loading}
>
	<div class="col-span-2 pb-1 pt-3 text-sm font-semibold uppercase @2xl:col-span-1 @2xl:pb-2">
		{message.role}
	</div>
	<!-- svelte-ignore a11y-autofocus -->
	<textarea
		{autofocus}
		bind:value={message.content}
		placeholder="Enter {message.role} message"
		class="resize-none overflow-hidden rounded bg-transparent px-2 py-2.5 ring-gray-100 hover:resize-y hover:bg-white focus:resize-y focus:bg-white focus:ring group-hover/message:ring @2xl:px-3 dark:ring-gray-600 dark:hover:bg-gray-900 dark:focus:bg-gray-900"
		rows="1"
		on:input={() => {
			dispatch("input");
		}}
	></textarea>
	<button
		tabindex="0"
		on:click={() => {
			dispatch("delete");
		}}
		type="button"
		class="mt-1.5 size-8 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 group-hover/message:block sm:hidden dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
		>✕</button
	>
</div>
