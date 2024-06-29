<script lang="ts">
	import PlaygroundCode from './PlaygroundCode.svelte';
	import {
		createHfInference,
		prepareRequestMessages,
		handleStreamingResponse,
		handleNonStreamingResponse
	} from './playgroundUtils';
	import PlaygroundMessage from '$lib/components/Playground/PlaygroundMessage.svelte';
	import PlaygroundOptions from '$lib/components/Playground/PlaygroundOptions.svelte';
	import PlaygroundTokenModal from './PlaygroundTokenModal.svelte';
	import PlaygroundModelSelector from './PlaygroundModelSelector.svelte';

	const compatibleModels: string[] = [
		'01-ai/Yi-1.5-34B-Chat',
		'codellama/CodeLlama-34b-Instruct-hf',
		'CohereForAI/c4ai-command-r-plus',
		'google/gemma-1.1-2b-it',
		'google/gemma-1.1-7b-it',
		'google/gemma-2-27b-it',

		'HuggingFaceH4/zephyr-7b-beta',
		'HuggingFaceH4/zephyr-orpo-141b-A35b-v0.1',
		'HuggingFaceM4/idefics-9b-instruct',

		'meta-llama/Llama-2-13b-chat-hf',
		'meta-llama/Llama-2-70b-chat-hf',
		'meta-llama/Llama-2-7b-chat-hf',
		'meta-llama/Meta-Llama-3-70B-Instruct',
		'meta-llama/Meta-Llama-3-8B-Instruct',
		'microsoft/Phi-3-mini-4k-instruct',
		'mistralai/Mistral-7B-Instruct-v0.1',
		'mistralai/Mistral-7B-Instruct-v0.2',
		'mistralai/Mistral-7B-Instruct-v0.3',
		'mistralai/Mixtral-8x7B-Instruct-v0.1',
		'tiiuae/falcon-7b-instruct'
	];

	const startMessages: Message[] = [{ role: 'user', content: '' }];

	let conversations: Conversation[] = [
		{
			id: String(Math.random()),
			model: '01-ai/Yi-1.5-34B-Chat',
			config: { temperature: 0.5, maxTokens: 2048, streaming: true, jsonMode: false },
			messages: startMessages
		},
		{
			id: String(Math.random()),
			model: 'google/gemma-1.1-2b-it',
			config: { temperature: 0.1, maxTokens: 2048, streaming: true, jsonMode: false },
			messages: startMessages
		}
	];

	let currentConversation = conversations[0];
	let systemMessage: Message = { role: 'system', content: '' };
	$: messages = currentConversation.messages;

	let hfToken: string | null = '';
	let viewCode = false;
	let showTokenModal = false;
	let loading = false;
	let streamingMessage: Message | null = null;
	let tokens = 0;
	let latency = 0;
	let messageContainer: HTMLDivElement | null = null;

	function addMessage() {
		currentConversation.messages = [
			...currentConversation.messages,
			{
				role: currentConversation.messages.at(-1)?.role === 'user' ? 'assistant' : 'user',
				content: ''
			}
		];
		conversations = conversations;
	}

	function deleteMessage(i: number) {
		currentConversation.messages = currentConversation.messages.filter((_, j) => j !== i);
		conversations = conversations;
	}

	function reset() {
		currentConversation.messages = [...startMessages];
		systemMessage.content = '';
		conversations = conversations;
	}

	async function submit() {
		if (!hfToken) {
			showTokenModal = true;
			return;
		}
		(document.activeElement as HTMLElement).blur();
		loading = true;
		const startTime = performance.now();

		try {
			const hf = createHfInference(hfToken);
			const requestMessages = prepareRequestMessages(systemMessage, messages);

			if (currentConversation.config.streaming) {
				streamingMessage = { role: 'assistant', content: '' };
				currentConversation.messages = [...currentConversation.messages, streamingMessage];

				await handleStreamingResponse(
					hf,
					currentConversation.model,
					requestMessages,
					currentConversation.config.temperature,
					currentConversation.config.maxTokens,
					currentConversation.config.jsonMode,
					(content) => {
						if (streamingMessage) {
							streamingMessage.content = content;
							currentConversation.messages = [...currentConversation.messages];
							conversations = conversations;
							scrollToBottom();
						}
					}
				);
			} else {
				const newMessage = await handleNonStreamingResponse(
					hf,
					currentConversation.model,
					requestMessages,
					currentConversation.config.temperature,
					currentConversation.config.maxTokens,
					currentConversation.config.jsonMode
				);
				currentConversation.messages = [...currentConversation.messages, newMessage];
				conversations = conversations;
				scrollToBottom();
			}
		} catch (error) {
			alert('error: ' + (error as Error).message);
		} finally {
			const endTime = performance.now();
			latency = Math.round(endTime - startTime);
			loading = false;
			streamingMessage = null;
			scrollToBottom();
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
			submit();
		}
	}

	function scrollToBottom() {
		if (messageContainer) {
			messageContainer.scrollTop = messageContainer.scrollHeight;
		}
	}
</script>

<svelte:window on:keydown={onKeydown} />

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

<div
	class="w-dvh maxdivide-gray-200 grid overflow-hidden max-md:grid-cols-1 max-md:divide-y md:h-dvh md:grid-cols-[260px,minmax(0,1fr),270px] md:divide-x dark:divide-gray-800 dark:bg-gray-900 dark:text-gray-300"
>
	<div class="relative flex flex-col overflow-y-auto px-5 pb-24 pt-7">
		<div class="pb-2 text-sm font-semibold">SYSTEM</div>
		<textarea
			name=""
			id=""
			placeholder="Enter a custom prompt"
			bind:value={systemMessage.content}
			class="absolute inset-x-0 bottom-0 h-full resize-none bg-transparent p-2 px-5 pr-4 pt-16 text-sm outline-none"
		></textarea>
	</div>
	<div class="relative divide-y divide-gray-200 dark:divide-gray-800">
		<div
			class="flex h-[calc(100dvh-5rem)] divide-x divide-gray-200 {conversations.length === 2
				? '*:w-1/2'
				: conversations.length == 3
					? '*:w-1/3'
					: ''} dark:divide-gray-800"
		>
			{#each conversations as conversation}
				<div
					class="@container flex max-h-[calc(100dvh-5rem)] flex-col divide-y divide-gray-200 overflow-y-auto overflow-x-hidden dark:divide-gray-800"
					bind:this={messageContainer}
				>
					{#if conversations.length > 1}
						<div
							class="flex h-10 items-center bg-gradient-to-r from-gray-50 px-6 text-gray-500 dark:from-gray-400/20"
						>
							{conversation.model}
						</div>
					{/if}
					{#if !viewCode}
						{#each messages as message, i}
							<PlaygroundMessage {message} on:delete={() => deleteMessage(i)} />
						{/each}

						<button
							class="flex px-6 py-6 hover:bg-gray-50 dark:hover:bg-gray-800/50"
							on:click={addMessage}
						>
							<div class="flex items-center gap-2 !p-0 text-sm font-semibold">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="1em"
									height="1em"
									viewBox="0 0 32 32"
									class="text-lg"
									><path
										fill="currentColor"
										d="M16 2A14.172 14.172 0 0 0 2 16a14.172 14.172 0 0 0 14 14a14.172 14.172 0 0 0 14-14A14.172 14.172 0 0 0 16 2Zm8 15h-7v7h-2v-7H8v-2h7V8h2v7h7Z"
									/><path fill="none" d="M24 17h-7v7h-2v-7H8v-2h7V8h2v7h7v2z" /></svg
								>Add message
							</div>
						</button>
					{:else}
						<PlaygroundCode {...currentConversation} {...currentConversation.config} />
					{/if}
				</div>
			{/each}
		</div>
		<div
			class="inset-x-0 bottom-0 flex h-20 items-center gap-2 overflow-hidden whitespace-nowrap px-5 md:absolute"
		>
			<button
				type="button"
				class="flex h-[39px] flex-none gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
			>
				<div
					class="flex size-5 items-center justify-center rounded border border-black/5 bg-black/5 text-xs"
				>
					<svg
						width="1em"
						height="1em"
						viewBox="0 0 24 25"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M5.41 9.41L4 8L12 0L20 8L18.59 9.41L13 3.83L13 17.5H11L11 3.83L5.41 9.41ZM22 17.5V23H2V17.5H0V23C0 23.5304 0.210714 24.0391 0.585786 24.4142C0.960859 24.7893 1.46957 25 2 25H22C22.5304 25 23.0391 24.7893 23.4142 24.4142C23.7893 24.0391 24 23.5304 24 23V17.5H22Z"
							fill="currentColor"
						/>
					</svg>
				</div>

				Share</button
			>

			<button
				type="button"
				on:click={reset}
				class="flex size-[39px] flex-none items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
				><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32"
					><path fill="currentColor" d="M12 12h2v12h-2zm6 0h2v12h-2z" /><path
						fill="currentColor"
						d="M4 6v2h2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z"
					/></svg
				></button
			>
			<div class="flex-1 items-center justify-center text-center text-sm text-gray-500">
				<span class="max-xl:hidden">0 tokens · Latency {latency}ms</span>
			</div>
			<button
				type="button"
				on:click={() => (viewCode = !viewCode)}
				class="flex h-[39px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="1em"
					height="1em"
					class="text-base"
					viewBox="0 0 32 32"
					><path
						fill="currentColor"
						d="m31 16l-7 7l-1.41-1.41L28.17 16l-5.58-5.59L24 9l7 7zM1 16l7-7l1.41 1.41L3.83 16l5.58 5.59L8 23l-7-7zm11.42 9.484L17.64 6l1.932.517L14.352 26z"
					/></svg
				>
				{!viewCode ? 'Get Code' : 'Hide Code'}</button
			>
			<button
				on:click={() => {
					viewCode = false;
					submit();
				}}
				type="button"
				class="flex h-[39px] w-24 items-center justify-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-50 dark:border-gray-700 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-gray-700"
			>
				{#if loading}
					<div class="flex flex-none items-center gap-[3px]">
						<div
							class="h-1 w-1 flex-none animate-bounce rounded-full bg-gray-500 dark:bg-gray-200"
							style="animation-delay: 0.25s;"
						/>
						<div
							class="h-1 w-1 flex-none animate-bounce rounded-full bg-gray-500 dark:bg-gray-200"
							style="animation-delay: 0.5s;"
						/>
						<div
							class="h-1 w-1 flex-none animate-bounce rounded-full bg-gray-500 dark:bg-gray-200"
							style="animation-delay: 0.75s;"
						/>
					</div>
				{:else}
					Run <span
						class="inline-flex gap-0.5 rounded border border-white/20 bg-white/10 px-0.5 text-xs text-white/70"
						>⌘<span class="translate-y-px">↵</span></span
					>
				{/if}
			</button>
		</div>
	</div>
	<div class="flex flex-col gap-6 overflow-y-hidden p-5">
		<PlaygroundModelSelector {compatibleModels} bind:currentModel={currentConversation.model} />
		<PlaygroundOptions
			bind:temperature={currentConversation.config.temperature}
			bind:maxTokens={currentConversation.config.maxTokens}
			bind:jsonMode={currentConversation.config.jsonMode}
			bind:streaming={currentConversation.config.streaming}
		/>
		<!-- <div
			class="mt-auto flex max-w-xs flex-col items-start gap-2.5 rounded-lg border bg-white p-4 text-gray-500 shadow dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
			role="alert"
		>
			<span class="text-sm font-semibold text-gray-900 dark:text-white">Get more usage</span>
			<div class="text-sm font-normal">Larger models, x10 quota, and advanced features.</div>
			<a
				href="#"
				class="inline-flex rounded-lg bg-black px-2.5 py-1.5 text-center text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:hover:bg-black dark:focus:ring-blue-800"
				>Get PRO ($9/month)</a
			>
		</div> -->
		<!-- <div
		class="flex max-w-xs flex-col items-start gap-2.5 rounded-lg border bg-white p-4 text-gray-500 shadow dark:bg-gray-800 dark:text-gray-400"
		role="alert"
	>
		<span class="text-sm font-semibold text-gray-900 dark:text-white">Deploy dedicated</span>
		<div class="text-sm font-normal">Deploy your own production ready endpoint</div>
		<a
			href="#"
			class="inline-flex rounded-lg bg-black px-2.5 py-1.5 text-center text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:hover:bg-black dark:focus:ring-blue-800"
			>Deploy dedicated</a
		>
	</div> -->
		<div class="mt-auto">
			<div class="mb-3 flex items-center justify-between gap-2">
				<label for="default-range" class="block text-sm font-medium text-gray-900 dark:text-white"
					>API Quota</label
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
