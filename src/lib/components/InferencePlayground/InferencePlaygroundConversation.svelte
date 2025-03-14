<script lang="ts">
	import type { Conversation } from "$lib/types.js";

	import { tick } from "svelte";

	import IconPlus from "~icons/carbon/add";
	import CodeSnippets from "./InferencePlaygroundCodeSnippets.svelte";
	import Message from "./InferencePlaygroundMessage.svelte";

	export let conversation: Conversation;
	export let loading: boolean;
	export let viewCode: boolean;
	export let compareActive: boolean;

	let shouldScrollToBottom = true;
	let isProgrammaticScroll = true;
	let conversationLength = conversation.messages.length;

	let messageContainer: HTMLDivElement | null = null;

	async function resizeMessageTextAreas() {
		// ideally we would use CSS "field-sizing:content". However, it is currently only supported on Chrome.
		await tick();
		if (messageContainer) {
			const containerScrollTop = messageContainer.scrollTop;
			const textareaEls = messageContainer.querySelectorAll("textarea");
			for (const textarea of textareaEls) {
				textarea.style.height = "0px";
				textarea.style.height = textarea.scrollHeight + "px";
			}
			messageContainer.scrollTop = containerScrollTop;
		}
	}

	function scrollToBottom() {
		if (messageContainer) {
			isProgrammaticScroll = true;
			messageContainer.scrollTop = messageContainer.scrollHeight;
		}
	}

	$: {
		if (conversation.messages.at(-1)) {
			resizeMessageTextAreas();
			if (shouldScrollToBottom) {
				scrollToBottom();
			}
		}
	}

	$: if (conversation.messages.length !== conversationLength) {
		// enable automatic scrolling when new message was added
		conversationLength = conversation.messages.length;
		shouldScrollToBottom = true;
	}

	$: viewCode, resizeMessageTextAreas();

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

<svelte:window on:resize={resizeMessageTextAreas} />

<div
	class="@container flex flex-col overflow-x-hidden overflow-y-auto {compareActive
		? 'max-h-[calc(100dvh-5.8rem-2.5rem-75px)] md:max-h-[calc(100dvh-5.8rem-2.5rem)]'
		: 'max-h-[calc(100dvh-5.8rem-2.5rem-75px)] md:max-h-[calc(100dvh-5.8rem)]'}"
	class:animate-pulse={loading && !conversation.streaming}
	bind:this={messageContainer}
	on:scroll={() => {
		// disable automatic scrolling is user initiates scroll
		if (!isProgrammaticScroll) {
			shouldScrollToBottom = false;
		}
		isProgrammaticScroll = false;
	}}
>
	{#if !viewCode}
		{#each conversation.messages as message, messageIdx}
			<Message
				class="border-b"
				bind:message
				{loading}
				on:input={resizeMessageTextAreas}
				on:delete={() => deleteMessage(messageIdx)}
				autofocus={!loading && messageIdx === conversation.messages.length - 1}
			/>
		{/each}

		<button
			class="flex px-3.5 py-6 hover:bg-gray-50 md:px-6 dark:hover:bg-gray-800/50"
			on:click={addMessage}
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
