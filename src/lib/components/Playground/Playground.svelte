<script lang="ts">
	import { HfInference } from '@huggingface/inference';
	import { queryParam, ssp } from 'sveltekit-search-params';

	import PlaygroundCode from './PlaygroundCode.svelte';
	import PlaygroundMessage from '$lib/components/Playground/PlaygroundMessage.svelte';
	import PlaygroundOptions from '$lib/components/Playground/PlaygroundOptions.svelte';

	type Message = {
		role: 'user' | 'assistant' | 'system';
		content: string;
	};

	const startMessages: Message[] = [{ role: 'user', content: '' }];

	const messagesParam = queryParam('messages', {
		encode: (value: Message[]) => JSON.stringify(value),
		decode: (value: string | null) => (value ? JSON.parse(value) : startMessages)
	});

	const systemMessageParam = queryParam('system', {
		encode: (value: string) => value,
		decode: (value: string | null) => value || ''
	});
	const compatibleModels: string[] = [
		'google/gemma-2-27b-it',
		'meta-llama/Meta-Llama-3-8B-Instruct',
		'meta-llama/Meta-Llama-3-70B-Instruct',
		'mistralai/Mistral-7B-Instruct-v0.3'
	];

	const currentModel = queryParam('model', ssp.string(compatibleModels[0]));
	const temperature = queryParam('temperature', ssp.number(0.5));
	const maxTokens = queryParam('max_tokens', ssp.number(2048));
	const streaming = queryParam('streaming', ssp.boolean(true));
	const jsonMode = queryParam('json_mode', ssp.boolean(false));
	$: systemMessage = { role: 'system', content: $systemMessageParam };
	$: messages = $messagesParam;

	let hfToken: string | null = '';
	let viewCode = false;
	let loading = false;
	let streamingMessage: Message | null = null;
	let latency = 0;
	let messageContainer: HTMLDivElement | null = null;

	function addMessage() {
		$messagesParam = [
			...$messagesParam,
			{ role: $messagesParam.at(-1)?.role === 'user' ? 'assistant' : 'user', content: '' }
		];
	}

	$: console.log($currentModel);

	function deleteMessage(i: number) {
		$messagesParam = $messagesParam.filter((_, j) => j !== i);
	}

	function reset() {
		$messagesParam = [...startMessages];
		$systemMessageParam = '';
	}

	function onKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
			submit();
		}
	}

	async function submit() {
		if (!hfToken) {
			const token = prompt(
				'Please enter your Hugging Face API token (with `inference` permission):'
			);
			if (!token) return;
			hfToken = token;
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
				$messagesParam = [...$messagesParam, streamingMessage];
				let out = '';

				for await (const chunk of hf.chatCompletionStream({
					model: $currentModel,
					messages: requestMessages,
					temperature: $temperature,
					max_tokens: $maxTokens,
					json_mode: $jsonMode
				})) {
					if (chunk.choices && chunk.choices.length > 0) {
						if (streamingMessage && chunk.choices[0]?.delta?.content) {
							out += chunk.choices[0].delta.content;
							streamingMessage.content = out;
							$messagesParam = [...$messagesParam];
							scrollToBottom();
						}
					}
				}
			} else {
				const response = await hf.chatCompletion({
					model: $currentModel,
					messages: requestMessages,
					temperature: $temperature,
					max_tokens: $maxTokens,
					json_mode: $jsonMode
				});

				if (response.choices && response.choices.length > 0) {
					const newMessage = { role: 'assistant', content: response.choices[0].message.content };
					$messagesParam = [...$messagesParam, newMessage];
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

<div
	class="w-dvh maxdivide-gray-200 grid h-dvh overflow-hidden max-md:grid-cols-1 max-md:divide-y md:grid-cols-[260px,minmax(0,1fr),260px] md:divide-x dark:divide-gray-800 dark:bg-gray-900 dark:text-gray-300"
>
	<div class="relative flex flex-col overflow-y-auto px-5 pb-24 pt-7">
		<div class="pb-2 text-sm font-semibold">SYSTEM</div>
		<textarea
			name=""
			id=""
			placeholder="Enter a custom prompt"
			bind:value={$systemMessageParam}
			class="absolute inset-x-0 bottom-0 h-full resize-none bg-transparent p-2 pl-5 pr-3 pt-14 outline-none"
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
				<PlaygroundCode />
			{/if}
		</div>

		<div
			class="inset-x-0 bottom-0 flex h-20 items-center gap-2 overflow-hidden whitespace-nowrap px-5 md:absolute"
		>
			<button
				type="button"
				class="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
				>Share</button
			>

			<button
				type="button"
				on:click={reset}
				class="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
				>Reset</button
			>
			<div class="flex-1 items-center justify-center text-center text-sm text-gray-500">
				0 tokens · Latency {latency}ms
			</div>
			<button
				type="button"
				on:click={() => (viewCode = !viewCode)}
				class="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
				>{!viewCode ? 'View Code' : 'Hide Code'}</button
			>
			<button
				on:click={submit}
				disabled={viewCode || loading}
				type="button"
				class="flex h-[42px] w-24 items-center justify-center rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-50 dark:border-gray-700 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-gray-700"
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
					Submit
				{/if}
			</button>
		</div>
	</div>
	<div class="flex flex-col gap-6 overflow-hidden p-5">
		<PlaygroundOptions
			{compatibleModels}
			bind:currentModel={$currentModel}
			bind:temperature={$temperature}
			bind:maxTokens={$maxTokens}
			bind:jsonMode={$jsonMode}
			bind:streaming={$streaming}
		/>
	</div>
</div>
