<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import CodeSnippets from './InferencePlaygroundCodeSnippets.svelte';
	import Message from './InferencePlaygroundMessage.svelte';
	import IconPlus from '../Icons/IconPlus.svelte';
	import type { Conversation } from '$lib/types';

	export let loading;
	export let conversation: Conversation;
	export let viewCode;

	const dispatch = createEventDispatcher<{
		addMessage: void;
		deleteMessage: number;
	}>();

	let messageContainer: HTMLDivElement | null = null;

	function scrollToBottom() {
		if (messageContainer) {
			messageContainer.scrollTop = messageContainer.scrollHeight;
		}
	}

	$: {
		if (conversation.messages.at(-1)) {
			scrollToBottom();
		}
	}
</script>

<div
	class="flex max-h-[calc(100dvh-5.8rem)] flex-col overflow-y-auto overflow-x-hidden @container"
	class:pointer-events-none={loading}
	class:animate-pulse={loading && !conversation.streaming}
	bind:this={messageContainer}
>
	{#if !viewCode}
		{#each conversation.messages as message, messageIdx}
			<Message
				class="border-b"
				{message}
				{messageIdx}
				on:messageValueChanged
				on:delete={() => dispatch('deleteMessage', messageIdx)}
				autofocus={!loading && messageIdx === conversation.messages.length - 1}
			/>
		{/each}

		<button
			class="flex px-6 py-6 hover:bg-gray-50 dark:hover:bg-gray-800/50"
			on:click={() => dispatch('addMessage')}
			disabled={loading}
		>
			<div class="flex items-center gap-2 !p-0 text-sm font-semibold">
				<IconPlus classNames="text-lg" /> Add message
			</div>
		</button>
	{:else}
		<CodeSnippets {conversation} />
	{/if}
</div>
