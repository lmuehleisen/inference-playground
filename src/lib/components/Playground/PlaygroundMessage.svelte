<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	type Message = {
		role: 'user' | 'assistant';
		content: string;
	};

	export let message: Message;

	const dispatch = createEventDispatcher();
</script>

<div
	class="group/message group grid grid-cols-[130px,1fr,2.5rem] items-start gap-4 px-6 pb-6 pt-4 hover:bg-gray-50 dark:hover:bg-gray-800"
>
	<div class="pb-2 pt-3 text-sm font-semibold uppercase">{message.role}</div>
	<textarea
		autofocus={message.role === 'user'}
		bind:value={message.content}
		placeholder="Enter {message.role} message"
		class="resize-none rounded bg-transparent px-3 py-2.5 ring-gray-100 [field-sizing:content] hover:resize-y hover:bg-white focus:resize-y focus:bg-white focus:ring group-hover/message:ring dark:ring-gray-600 dark:hover:bg-gray-900 dark:focus:bg-gray-900"
		rows="1"
	></textarea>
	<button
		tabindex="1"
		on:click={() => {
			dispatch('delete');
		}}
		type="button"
		class="mt-1.5 hidden size-8 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 group-hover/message:block dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
		>✕</button
	>
</div>
