<script lang="ts">
	import { run } from "svelte/legacy";

	import type { Conversation } from "$lib/types.js";

	import IconPlus from "~icons/carbon/add";
	import CodeSnippets from "./InferencePlaygroundCodeSnippets.svelte";

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
		{#each conversation.messages as msg, idx}
			<div
				class=" group/message group grid grid-cols-[1fr_2.5rem] items-start gap-2 border-b px-3.5 pt-4 pb-6 hover:bg-gray-100/70 @-2xl:grid-cols-[130px_1fr_2.5rem] @2xl:grid-rows-1 @2xl:gap-4 @2xl:px-6 dark:border-gray-800 dark:hover:bg-gray-800/30"
				class:pointer-events-none={loading}
			>
				<div class="col-span-2 pt-3 pb-1 text-sm font-semibold uppercase @2xl:col-span-1 @2xl:pb-2">
					{msg.role}
				</div>
				<!-- svelte-ignore a11y_autofocus -->
				<!-- svelte-ignore a11y_positive_tabindex -->
				<textarea
					autofocus={idx === conversation.messages.length - 1}
					bind:value={conversation.messages[idx]!.content}
					placeholder="Enter {msg.role} message"
					class="resize-none overflow-hidden rounded-sm bg-transparent px-2 py-2.5 ring-gray-100 outline-none group-hover/message:ring-3 hover:resize-y hover:bg-white focus:resize-y focus:bg-white focus:ring-3 @2xl:px-3 dark:ring-gray-600 dark:hover:bg-gray-900 dark:focus:bg-gray-900"
					rows="1"
					tabindex="2"
				></textarea>
				<button
					tabindex="0"
					onclick={() => deleteMessage(idx)}
					type="button"
					class="mt-1.5 size-8 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-900 group-hover/message:block hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 focus:outline-hidden sm:hidden dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
					>✕</button
				>
			</div>
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
