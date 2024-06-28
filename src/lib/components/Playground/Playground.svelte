<script lang="ts">
	import { HfInference } from '@huggingface/inference';

	import PlaygroundCode from './PlaygroundCode.svelte';
	import PlaygroundMessage from '$lib/components/Playground/PlaygroundMessage.svelte';
	import PlaygroundOptions from '$lib/components/Playground/PlaygroundOptions.svelte';
	import PlaygroundTokenModal from './PlaygroundTokenModal.svelte';

	type Message = {
		role: 'user' | 'assistant' | 'system';
		content: string;
	};

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

	let messages = startMessages;
	let systemMessage = { role: 'system', content: '' };
	let currentModel = compatibleModels[0];
	let temperature = 0.5;
	let maxTokens = 2048;
	let streaming = true;
	let jsonMode = false;

	let hfToken: string | null = '';
	let viewCode = false;
	let showTokenModal = false;
	let loading = false;
	let streamingMessage: Message | null = null;
	let latency = 0;
	let messageContainer: HTMLDivElement | null = null;

	function addMessage() {
		messages = [
			...messages,
			{ role: messages.at(-1)?.role === 'user' ? 'assistant' : 'user', content: '' }
		];
	}

	function deleteMessage(i: number) {
		messages = messages.filter((_, j) => j !== i);
	}

	function reset() {
		messages = [...startMessages];
		systemMessage.content = '';
	}

	function onKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
			submit();
		}
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
			const hf = new HfInference(hfToken);

			const requestMessages = [
				...(systemMessage.content.length
					? [{ role: 'system', content: systemMessage.content }]
					: []),
				...messages.map(({ role, content }) => ({ role, content }))
			];

			if (streaming) {
				streamingMessage = { role: 'assistant', content: '' };
				messages = [...messages, streamingMessage];
				let out = '';

				for await (const chunk of hf.chatCompletionStream({
					model: currentModel,
					messages: requestMessages,
					temperature: temperature,
					max_tokens: maxTokens,
					json_mode: jsonMode
				})) {
					if (chunk.choices && chunk.choices.length > 0) {
						if (streamingMessage && chunk.choices[0]?.delta?.content) {
							out += chunk.choices[0].delta.content;
							streamingMessage.content = out;
							messages = [...messages];
							scrollToBottom();
						}
					}
				}
			} else {
				const response = await hf.chatCompletion({
					model: currentModel,
					messages: requestMessages,
					temperature: temperature,
					max_tokens: maxTokens,
					json_mode: jsonMode
				});

				if (response.choices && response.choices.length > 0) {
					const newMessage = { role: 'assistant', content: response.choices[0].message.content };
					messages = [...messages, newMessage];
					scrollToBottom();
				}
			}
		} catch (error) {
			alert('error: ' + error.message);
		} finally {
			const endTime = performance.now();
			latency = Math.round(endTime - startTime);
			loading = false;
			streamingMessage = null;
			scrollToBottom();
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
	class="w-dvh maxdivide-gray-200 grid overflow-hidden max-md:grid-cols-1 max-md:divide-y md:h-dvh md:grid-cols-[260px,minmax(0,1fr),260px] md:divide-x dark:divide-gray-800 dark:bg-gray-900 dark:text-gray-300"
>
	<div class="relative flex flex-col overflow-y-auto px-5 pb-24 pt-7">
		<div class="pb-2 text-sm font-semibold">SYSTEM</div>
		<textarea
			name=""
			id=""
			placeholder="Enter a custom prompt"
			bind:value={systemMessage.content}
			class="absolute inset-x-0 bottom-0 h-full resize-none bg-transparent p-2 pl-5 pr-3 pt-16 text-sm outline-none"
		></textarea>
	</div>
	<div class="relative divide-y divide-gray-200 dark:divide-gray-800">
		<div
			class="flex max-h-[calc(100dvh-5rem)] flex-col divide-y divide-gray-200 overflow-y-auto overflow-x-hidden dark:divide-gray-800"
			bind:this={messageContainer}
		>
			{#if !viewCode}
				{#each messages as message, i}
					<PlaygroundMessage {message} on:delete={() => deleteMessage(i)} />
				{/each}

				<button
					class="flex px-6 py-6 hover:bg-gray-50 dark:hover:bg-gray-800/50"
					on:click={addMessage}
				>
					<div class="!p-0 text-sm font-semibold">Add message</div>
				</button>
			{:else}
				<PlaygroundCode model={currentModel} {streaming} {temperature} {maxTokens} />
			{/if}
		</div>

		<div
			class="inset-x-0 bottom-0 flex h-20 items-center gap-2 overflow-hidden whitespace-nowrap px-5 md:absolute"
		>
			<button
				type="button"
				class="flex-none rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
				>Share</button
			>

			<button
				type="button"
				on:click={reset}
				class="flex size-[42px] flex-none items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
				><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32"
					><path fill="currentColor" d="M12 12h2v12h-2zm6 0h2v12h-2z" /><path
						fill="currentColor"
						d="M4 6v2h2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z"
					/></svg
				></button
			>
			<div class="flex-1 items-center justify-center text-center text-sm text-gray-500">
				<span class="max-lg:hidden">0 tokens · Latency {latency}ms</span>
			</div>
			<button
				type="button"
				on:click={() => (viewCode = !viewCode)}
				class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
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
				{!viewCode ? 'View Code' : 'Hide Code'}</button
			>
			<button
				on:click={() => {
					viewCode = false;
					submit();
				}}
				type="button"
				class="flex h-[42px] w-24 items-center justify-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-50 dark:border-gray-700 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-gray-700"
			>
				{#if loading}
					<div class="flex flex-none items-center gap-[3px]">
						<div
							class="h-1 w-1 flex-none animate-bounce rounded-full bg-gray-500 dark:bg-gray-400"
							style="animation-delay: 0.25s;"
						/>
						<div
							class="h-1 w-1 flex-none animate-bounce rounded-full bg-gray-500 dark:bg-gray-400"
							style="animation-delay: 0.5s;"
						/>
						<div
							class="h-1 w-1 flex-none animate-bounce rounded-full bg-gray-500 dark:bg-gray-400"
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
	<div class="flex flex-col gap-6 overflow-hidden p-5">
		<PlaygroundOptions
			{compatibleModels}
			bind:currentModel
			bind:temperature
			bind:maxTokens
			bind:jsonMode
			bind:streaming
		/>
	</div>
</div>
