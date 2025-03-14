<script lang="ts">
	import { run } from "svelte/legacy";

	import type { Conversation } from "$lib/types.js";

	import IconPlus from "~icons/carbon/add";
	import CodeSnippets from "./code-snippets.svelte";
	import Message from "./message.svelte";

	interface Props {
		conversation: Conversation;
		loading: boolean;
		viewCode: boolean;
		compareActive: boolean;
	}

	let { conversation = $bindable(), loading, viewCode, compareActive }: Props = $props();

	let shouldScrollToBottom = $state(true);
	let isProgrammaticScroll = $state(true);
	let conversationLength = $state(conversation.messages.length);

	let messageContainer: HTMLDivElement | null = $state(null);

	function scrollToBottom() {
		if (messageContainer) {
			isProgrammaticScroll = true;
			messageContainer.scrollTop = messageContainer.scrollHeight;
		}
	}

	run(() => {
		if (conversation.messages.at(-1)) {
			if (shouldScrollToBottom) {
				scrollToBottom();
			}
		}
	});

	run(() => {
		if (conversation.messages.length !== conversationLength) {
			// enable automatic scrolling when new message was added
			conversationLength = conversation.messages.length;
			shouldScrollToBottom = true;
		}
	});

	function addMessage() {
		const msgs = conversation.messages.slice();
		conversation.messages = [
			...msgs,
			{
				role: msgs.at(-1)?.role === "user" ? "assistant" : "user",
				content: "",
			},
		];
		conversation = conversation;
	}

	function deleteMessage(idx: number) {
		conversation.messages.splice(idx, 1);
		conversation = conversation;
	}
</script>

<div
	class="@container flex flex-col overflow-x-hidden overflow-y-auto {compareActive
		? 'max-h-[calc(100dvh-5.8rem-2.5rem-75px)] md:max-h-[calc(100dvh-5.8rem-2.5rem)]'
		: 'max-h-[calc(100dvh-5.8rem-2.5rem-75px)] md:max-h-[calc(100dvh-5.8rem)]'}"
	class:animate-pulse={loading && !conversation.streaming}
	bind:this={messageContainer}
	onscroll={() => {
		// disable automatic scrolling is user initiates scroll
		if (!isProgrammaticScroll) {
			shouldScrollToBottom = false;
		}
		isProgrammaticScroll = false;
	}}
>
	{#if !viewCode}
		{#each conversation.messages as _msg, idx}
			<Message
				bind:content={conversation.messages[idx]!.content}
				role={conversation.messages[idx]!.role}
				autofocus={idx === conversation.messages.length - 1}
				{loading}
				onDelete={() => deleteMessage(idx)}
			/>
		{/each}

		<button
			class="flex px-3.5 py-6 hover:bg-gray-50 md:px-6 dark:hover:bg-gray-800/50"
			onclick={addMessage}
			disabled={loading}
		>
			<div class="flex items-center gap-2 p-0! text-sm font-semibold">
				<div class="text-lg">
					<IconPlus />
				</div>
				Add message
			</div>
		</button>
	{:else}
		<CodeSnippets {conversation} on:closeCode />
	{/if}
</div>
