<script lang="ts">
	import {
		createHfInference,
		handleStreamingResponse,
		handleNonStreamingResponse,
		isSystemPromptSupported
	} from './inferencePlaygroundUtils';
	import PlaygroundOptions from './InferencePlaygroundGenerationConfig.svelte';
	import PlaygroundTokenModal from './InferencePlaygroundHFTokenModal.svelte';
	import PlaygroundModelSelector from './InferencePlaygroundModelSelector.svelte';
	import Conversation from './InferencePlaygroundConversation.svelte';
	import { onDestroy } from 'svelte';
	import { type ChatCompletionInputMessage } from '@huggingface/tasks';
	import type { ModelEntryWithTokenizer } from '$lib/types';
	import { defaultGenerationConfig } from './generationConfigSettings';
	import IconShare from '../Icons/IconShare.svelte';
	import IconDelete from '../Icons/IconDelete.svelte';
	import IconCode from '../Icons/IconCode.svelte';
	import IconCaret from '../Icons/IconCaret.svelte';

	export let models: ModelEntryWithTokenizer[];

	const startMessages: ChatCompletionInputMessage[] = [{ role: 'user', content: '' }];

	let conversations: Conversation[] = [
		{
			id: String(Math.random()),
			model: models[0],
			config: defaultGenerationConfig,
			messages: startMessages,
			streaming: true
		}
	];

	$: if (conversations.length > 1) {
		viewCode = false;
	}

	let systemMessage: ChatCompletionInputMessage = { role: 'system', content: '' };
	let hfToken: string | null = import.meta.env.VITE_HF_TOKEN;
	let viewCode = false;
	let showTokenModal = false;
	let loading = false;
	let tokens = 0;
	let latency = 0;
	let abortControllers: AbortController[] = [];
	let waitForNonStreaming = true;

	$: systemPromptSupported = isSystemPromptSupported(conversations[0].model);

	onDestroy(() => {
		for (const abortController of abortControllers) {
			abortController.abort();
		}
	});

	function addMessage() {
		conversations = conversations.map((conversation) => {
			conversation.messages = [
				...conversation.messages,
				{
					role: conversation.messages.at(-1)?.role === 'user' ? 'assistant' : 'user',
					content: ''
				}
			];
			return conversation;
		});
	}

	function updateMessage(value: string, conversationIdx: number, messageIdx: number) {
		const lastMsgIdx = conversations[0].messages.length - 1;
		const msg = conversations[conversationIdx].messages[messageIdx];
		msg.content = value;
		const { role } = msg;
		if (messageIdx === lastMsgIdx && role === 'user') {
			conversations = conversations.map((conversation) => {
				conversation.messages[messageIdx].content = value;
				return conversation;
			});
		}
		conversations = conversations;
	}

	function deleteAndGetItem<T>(array: T[], index: number) {
		if (index >= 0 && index < array.length) {
			return array.splice(index, 1)[0];
		}
		return undefined;
	}

	function deleteMessage(idx: number) {
		conversations = conversations.map((conversation) => {
			deleteAndGetItem<ChatCompletionInputMessage>(conversation.messages, idx);
			return conversation;
		});
	}

	function deleteConversation(idx: number) {
		deleteAndGetItem(conversations, idx);
		conversations = conversations;
	}

	function reset() {
		systemMessage.content = '';
		conversations = conversations.map((conversation) => {
			conversation.messages = [...startMessages];
			return conversation;
		});
	}

	function abort() {
		if (abortControllers.length) {
			for (const abortController of abortControllers) {
				abortController.abort();
			}
			abortControllers = [];
		}
		loading = false;
		waitForNonStreaming = false;
	}

	async function runInference(conversation: Conversation) {
		const startTime = performance.now();
		const hf = createHfInference(hfToken);
		const requestMessages = [
			...(systemPromptSupported && systemMessage?.content?.length ? [systemMessage] : []),
			...conversation.messages
		];

		if (conversation.streaming) {
			const streamingMessage = { role: 'assistant', content: '' };
			conversation.messages = [...conversation.messages, streamingMessage];
			const abortController = new AbortController();
			abortControllers.push(abortController);

			await handleStreamingResponse(
				hf,
				conversation,
				(content) => {
					if (streamingMessage) {
						streamingMessage.content = content;
						conversation.messages = [...conversation.messages];
						conversations = conversations;
					}
				},
				abortController,
				systemMessage
			);
		} else {
			waitForNonStreaming = true;
			const newMessage = await handleNonStreamingResponse(hf, conversation, systemMessage);
			// check if the user did not abort the request
			if (waitForNonStreaming) {
				conversation.messages = [...conversation.messages, newMessage];
				conversations = conversations;
			}
		}

		const endTime = performance.now();
		latency = Math.round(endTime - startTime);
	}

	async function submit() {
		// // last message has to be from user
		// if (currentConversation.messages?.at(-1)?.role !== 'user') {
		// 	addMessage();
		// 	return;
		// }
		if (!hfToken) {
			showTokenModal = true;
			return;
		}
		(document.activeElement as HTMLElement).blur();
		loading = true;

		try {
			const promises = conversations.map((conversation) => runInference(conversation));
			await Promise.all(promises);
			addMessage();
		} catch (error) {
			if (error.name !== 'AbortError') {
				alert('error: ' + (error as Error).message);
			}
		} finally {
			loading = false;
			abortControllers = [];
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if (!event.shiftKey && event.key === 'Enter') {
			submit();
		}
	}

	function changeSelectedModel(modelIdx: number) {
		conversations[0] = { ...conversations[0], model: models[modelIdx] };
	}
</script>

{#if showTokenModal}
	<PlaygroundTokenModal
		on:close={() => (showTokenModal = false)}
		on:submit={(e) => {
			const formData = new FormData(e.target);
			hfToken = formData.get('hf-token');
			submit();
			showTokenModal = false;
		}}
	/>
{/if}

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="w-dvh grid divide-gray-200 overflow-hidden bg-gray-100/50 max-md:divide-y md:h-dvh dark:[color-scheme:dark]
	{conversations.length === 1
		? 'md:grid-cols-[clamp(220px,20%,350px),minmax(0,1fr),clamp(270px,25%,300px)]'
		: 'md:grid-cols-[clamp(220px,20%,350px),minmax(0,1fr),0]'}
	
	 dark:divide-gray-800 dark:bg-gray-900 dark:text-gray-300"
>
	<div class=" flex flex-col overflow-y-auto py-3 pr-3">
		<div
			class="relative flex flex-1 flex-col gap-6 overflow-y-hidden rounded-r-xl border-x border-y border-gray-200/80 bg-gradient-to-b from-white via-white p-3 shadow-sm dark:border-white/5 dark:from-gray-800/40 dark:via-gray-800/40"
			class:pointer-events-none={!systemPromptSupported}
			class:opacity-70={!systemPromptSupported}
		>
			<div class="pb-2 text-sm font-semibold uppercase">system</div>
			<textarea
				name=""
				id=""
				placeholder={systemPromptSupported
					? 'Enter a custom prompt'
					: 'System prompt is not supported with the chosen model.'}
				bind:value={systemMessage.content}
				class="absolute inset-x-0 bottom-0 h-full resize-none bg-transparent px-3 pt-10 text-sm outline-none"
			></textarea>
		</div>
	</div>
	<div class="relative divide-y divide-gray-200 pt-3 dark:divide-gray-800" on:keydown={onKeydown}>
		<div
			class="flex h-[calc(100dvh-5rem)] divide-x divide-gray-200 {conversations.length === 2
				? '*:w-1/2'
				: conversations.length == 3
					? '*:w-1/3'
					: '*:w-full'} dark:divide-gray-800"
		>
			{#each conversations as conversation, index}
				<Conversation
					{loading}
					{conversation}
					{index}
					{viewCode}
					sideBySide={conversations.length > 1}
					on:addMessage={addMessage}
					on:messageValueChanged={(e) => {
						const { conversationIdx, messageIdx, value } = e.detail;
						updateMessage(value, conversationIdx, messageIdx);
					}}
					on:deleteMessage={(e) => deleteMessage(e.detail)}
					on:deleteConversation={(e) => deleteConversation(e.detail)}
				/>
			{/each}
		</div>
		<div
			class="fixed inset-x-0 bottom-0 flex h-20 items-center gap-2 overflow-hidden whitespace-nowrap px-3 md:absolute"
		>
			<button
				type="button"
				class="flex h-[39px] flex-none gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
			>
				<div
					class="flex size-5 items-center justify-center rounded border border-black/5 bg-black/5 text-xs"
				>
					<IconShare />
				</div>

				Share</button
			>

			<button
				type="button"
				on:click={reset}
				class="flex size-[39px] flex-none items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
			>
				<IconDelete />
			</button>
			<div class="flex-1 items-center justify-center text-center text-sm text-gray-500">
				<span class="max-xl:hidden">0 tokens · Latency {latency}ms</span>
			</div>
			<button
				type="button"
				on:click={() => (viewCode = !viewCode)}
				class="flex h-[39px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
			>
				<IconCode />
				{!viewCode ? 'View Code' : 'Hide Code'}</button
			>
			<button
				on:click={() => {
					viewCode = false;
					loading ? abort() : submit();
				}}
				type="button"
				class="flex h-[39px] w-24 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-4 focus:ring-gray-300 dark:border-gray-700 dark:focus:ring-gray-700 {loading
					? 'bg-red-900 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700'
					: 'bg-black hover:bg-gray-900 dark:bg-blue-600 dark:hover:bg-blue-700'}"
			>
				{#if loading}
					<div class="flex flex-none items-center gap-[3px]">
						<span class="mr-2">Cancel</span>
						<div
							class="h-1 w-1 flex-none animate-bounce rounded-full bg-gray-500 dark:bg-gray-100"
							style="animation-delay: 0.25s;"
						/>
						<div
							class="h-1 w-1 flex-none animate-bounce rounded-full bg-gray-500 dark:bg-gray-100"
							style="animation-delay: 0.5s;"
						/>
						<div
							class="h-1 w-1 flex-none animate-bounce rounded-full bg-gray-500 dark:bg-gray-100"
							style="animation-delay: 0.75s;"
						/>
					</div>
				{:else}
					Run <span
						class="inline-flex gap-0.5 rounded border border-white/20 bg-white/10 px-0.5 text-xs text-white/70"
						>↵</span
					>
				{/if}
			</button>
		</div>
	</div>
	{#if conversations.length === 1}
		<div class="flex flex-col p-3">
			<div
				class="flex flex-1 flex-col gap-6 overflow-y-hidden rounded-xl border border-gray-200/80 bg-gradient-to-b from-white via-white p-3 shadow-sm dark:border-white/5 dark:from-gray-800/40 dark:via-gray-800/40"
			>
				<PlaygroundModelSelector
					compatibleModels={models}
					on:modelIdxChange={(e) => changeSelectedModel(e.detail)}
				/>
				<!-- <div
					class="group relative -mt-4 flex h-[26px] w-full items-center justify-center gap-2 rounded-lg bg-black px-5 text-sm text-white hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:border-gray-700 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-gray-700"
				>
					Compare with...
					<IconCaret classNames="opacity-70" />
					<select
						class="absolute inset-0 border-none bg-white text-base opacity-0 outline-none"
						on:change|preventDefault={(e) => {
							conversations = [
								...conversations,
								{
									id: String(Math.random()),
									model: e.target.value,
									config: { temperature: 0.5, maxTokens: 2048, streaming: true },
									messages: [...conversations[0].messages]
								}
							];
						}}
					>
						{#each models as model}
							<option value={model.id}>{model.id}</option>
						{/each}
					</select>
				</div> -->

				<PlaygroundOptions bind:conversation={conversations[0]} />
				<div class="mt-auto">
					<div class="mb-3 flex items-center justify-between gap-2">
						<label
							for="default-range"
							class="block text-sm font-medium text-gray-900 dark:text-white">API Quota</label
						>
						<span
							class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300"
							>Free</span
						>

						<div class="ml-auto w-12 text-right text-sm">76%</div>
					</div>
					<div class="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
						<div class="h-2 rounded-full bg-black dark:bg-gray-400" style="width: 75%"></div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- only a html mockup -->
<div class="fixed inset-0 flex h-screen items-start justify-center bg-black/85 pt-32">
	<div class="flex w-full max-w-[600px] items-start justify-center p-10">
		<div
			class="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-white text-gray-900 shadow-md"
		>
			<div class="flex items-center border-b px-3">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="mr-2 text-sm"
					width="1em"
					height="1em"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="11" cy="11" r="8"></circle>
					<path d="m21 21-4.3-4.3"></path>
				</svg>
				<input
					autofocus
					class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm placeholder-gray-400 outline-none"
					placeholder="Search models..."
					value=""
				/>
			</div>
			<div class="max-h-[300px] overflow-y-auto overflow-x-hidden">
				<div class="p-1">
					<div class="px-2 py-1.5 text-xs font-medium text-gray-500">Trending</div>
					<div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="lucide lucide-star mr-2 h-4 w-4 text-yellow-400"
								><polygon
									points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
								></polygon></svg
							>
							<span class="inline-flex items-center"
								><span class="text-gray-500">meta-llama</span><span class="mx-1 text-black">/</span
								><span class="text-black">Meta-Llama-3-70B-Instruct</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="lucide lucide-star mr-2 h-4 w-4 text-yellow-400"
								><polygon
									points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
								></polygon></svg
							>
							<span class="inline-flex items-center"
								><span class="text-gray-500">mistralai</span><span class="mx-1 text-black">/</span
								><span class="text-black">Mixtral-8x7B-Instruct-v0.1</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="lucide lucide-star mr-2 h-4 w-4 text-yellow-400"
								><polygon
									points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
								></polygon></svg
							>
							<span class="inline-flex items-center"
								><span class="text-gray-500">google</span><span class="mx-1 text-black">/</span
								><span class="text-black">gemma-1.1-7b-it</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="lucide lucide-star mr-2 h-4 w-4 text-yellow-400"
								><polygon
									points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
								></polygon></svg
							>
							<span class="inline-flex items-center"
								><span class="text-gray-500">01-ai</span><span class="mx-1 text-black">/</span><span
									class="text-black">Yi-1.5-34B-Chat</span
								></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="lucide lucide-star mr-2 h-4 w-4 text-yellow-400"
								><polygon
									points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
								></polygon></svg
							>
							<span class="inline-flex items-center"
								><span class="text-gray-500">microsoft</span><span class="mx-1 text-black">/</span
								><span class="text-black">Phi-3-mini-4k-instruct</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="lucide lucide-star mr-2 h-4 w-4 text-yellow-400"
								><polygon
									points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
								></polygon></svg
							>
							<span class="inline-flex items-center"
								><span class="text-gray-500">TinyLlama</span><span class="mx-1 text-black">/</span
								><span class="text-black">TinyLlama-1.1B-Chat-v1.0</span></span
							>
						</div>
					</div>
				</div>
				<div class="mx-1 h-px bg-gray-200"></div>
				<div class="p-1">
					<div class="px-2 py-1.5 text-xs font-medium text-gray-500">Other Models</div>
					<div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">codellama</span><span class="mx-1 text-black">/</span
								><span class="text-black">CodeLlama-34b-Instruct-hf</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">google</span><span class="mx-1 text-black">/</span
								><span class="text-black">gemma-1.1-2b-it</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">google</span><span class="mx-1 text-black">/</span
								><span class="text-black">gemma-2b-it</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">HuggingFaceH4</span><span class="mx-1 text-black"
									>/</span
								><span class="text-black">zephyr-7b-alpha</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">HuggingFaceH4</span><span class="mx-1 text-black"
									>/</span
								><span class="text-black">zephyr-7b-beta</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">HuggingFaceH4</span><span class="mx-1 text-black"
									>/</span
								><span class="text-black">zephyr-orpo-141b-A35b-v0.1</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">HuggingFaceTB</span><span class="mx-1 text-black"
									>/</span
								><span class="text-black">SmolLM-1.7B-Instruct</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">meta-llama</span><span class="mx-1 text-black">/</span
								><span class="text-black">Llama-2-13b-chat-hf</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">meta-llama</span><span class="mx-1 text-black">/</span
								><span class="text-black">Llama-2-70b-chat-hf</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">meta-llama</span><span class="mx-1 text-black">/</span
								><span class="text-black">Llama-2-7b-chat-hf</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">meta-llama</span><span class="mx-1 text-black">/</span
								><span class="text-black">Meta-Llama-3-8B-Instruct</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">microsoft</span><span class="mx-1 text-black">/</span
								><span class="text-black">DialoGPT-large</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">mistralai</span><span class="mx-1 text-black">/</span
								><span class="text-black">Mistral-7B-Instruct-v0.1</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">mistralai</span><span class="mx-1 text-black">/</span
								><span class="text-black">Mistral-7B-Instruct-v0.2</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">mistralai</span><span class="mx-1 text-black">/</span
								><span class="text-black">Mistral-7B-Instruct-v0.3</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">NousResearch</span><span class="mx-1 text-black"
									>/</span
								><span class="text-black">Nous-Hermes-2-Mixtral-8x7B-DPO</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<span class="inline-flex items-center"
								><span class="text-gray-500">Qwen</span><span class="mx-1 text-black">/</span><span
									class="text-black">Qwen2-0.5B-Instruct</span
								></span
							>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
