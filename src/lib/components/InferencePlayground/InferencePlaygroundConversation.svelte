<script lang="ts">
	import type { Conversation } from "$lib/types";

	import { createEventDispatcher } from "svelte";

	import CodeSnippets from "./InferencePlaygroundCodeSnippets.svelte";
	import Message from "./InferencePlaygroundMessage.svelte";
	import IconPlus from "../Icons/IconPlus.svelte";

	export let conversation: Conversation;
	export let loading: boolean;
	export let viewCode: boolean;
	export let hfToken: string;

	const dispatch = createEventDispatcher<{
		addMessage: void;
		deleteMessage: number;
	}>();

	let messageContainer: HTMLDivElement | null = null;

	function resizeMessageTextAreas() {
		// ideally we would use CSS "field-sizing:content". However, it is currently only supported on Chrome.
		if (messageContainer) {
			const textareaEls = messageContainer.querySelectorAll("textarea");
			for (const textarea of textareaEls) {
				textarea.style.height = "0px";
				textarea.style.height = textarea.scrollHeight + "px";
			}
		}
	}

	function scrollToBottom() {
		if (messageContainer) {
			messageContainer.scrollTop = messageContainer.scrollHeight;
		}
	}

	$: {
		if (conversation.messages.at(-1)) {
			resizeMessageTextAreas();
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
				on:input={resizeMessageTextAreas}
				on:delete={() => dispatch("deleteMessage", messageIdx)}
				autofocus={!loading && messageIdx === conversation.messages.length - 1}
			/>
		{/each}

		<button
			class="flex px-3.5 py-6 hover:bg-gray-50 md:px-6 dark:hover:bg-gray-800/50"
			on:click={() => dispatch("addMessage")}
			disabled={loading}
		>
			<div class="flex items-center gap-2 !p-0 text-sm font-semibold">
				<IconPlus classNames="text-lg" /> Add message
			</div>
		</button>
	{:else}
		<CodeSnippets {conversation} {hfToken} />
	{/if}
</div>
