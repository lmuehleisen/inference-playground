<script lang="ts">
	import { HfInference } from '@huggingface/inference';

	import PlaygroundMessage from '$lib/components/Playground/PlaygroundMessage.svelte';
	import PlaygroundOptions from '$lib/components/Playground/PlaygroundOptions.svelte';

	type Message = {
		role: 'user' | 'assistant' | 'system';
		content: string;
	};

	const startMessages: Message[] = [{ role: 'user', content: '' }];
	const compatibleModels: string[] = [
		'meta-llama/Meta-Llama-3-8B-Instruct',
		'mistralai/Mistral-7B-Instruct-v0.3'
	];

	let hfToken: string | null = '';
	let currentModel = compatibleModels[0];
	let systemMessage: Message = { role: 'system', content: '' };
	let messages: Message[] = startMessages;
	let temperature = 0.5;
	let maxTokens = 32000;

	let loading = false;
	let streamingMessage: Message | null = null;

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
		messages = startMessages;
	}

	function onKeydown(event: KeyboardEvent) {
		// check if the user is pressing the enter key + ctrl key or command key
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
		streamingMessage = { role: 'assistant', content: '' };
		messages = [...messages, streamingMessage];

		try {
			const hf = new HfInference(hfToken);

			for await (const chunk of hf.chatCompletionStream({
				model: currentModel,
				messages: messages.map(({ role, content }) => ({ role, content })),
				temperature: temperature,
				max_tokens: maxTokens
			})) {
				if (streamingMessage && chunk.choices[0]?.delta?.content) {
					streamingMessage.content += chunk.choices[0].delta.content;
					messages = [...messages];
				}
			}
		} catch (error) {
			alert('error: ' + error.message);
		} finally {
			loading = false;
			streamingMessage = null;
		}
	}

	$: console.log(messages);
</script>

<svelte:window on:keydown={onKeydown} />

<div
	class="grid h-dvh max-h-dvh divide-gray-200 overflow-hidden max-md:grid-cols-1 max-md:divide-y md:grid-cols-[260px,1fr,260px] md:divide-x"
>
	<div class="relative flex flex-col overflow-y-auto p-5 pb-24">
		<div class="pb-2 text-sm font-semibold">SYSTEM</div>
		<textarea
			disabled
			name=""
			id=""
			placeholder="Enter a custom prompt"
			bind:value={systemMessage.content}
			class="absolute inset-x-0 bottom-0 h-full resize-none bg-transparent p-2 pl-5 pr-3 pt-12 outline-none"
		></textarea>
	</div>
	<div class="relative divide-y divide-gray-200">
		<div class="flex max-h-[calc(100dvh-5rem)] flex-col divide-y divide-gray-200 overflow-y-auto">
			{#each messages as message, i}
				<PlaygroundMessage {message} on:delete={() => deleteMessage(i)} />
			{/each}

			<button
				class="grid w-full grid-cols-[130px,1fr] items-center py-6 hover:bg-gray-50"
				on:click={addMessage}
			>
				<div class="button !p-0 text-sm font-semibold">Add message</div>
			</button>
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
				23 tokens · Latency 750ms
			</div>
			<button
				type="button"
				class="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
				>View Code</button
			>
			<button
				on:click={submit}
				type="button"
				class="flex h-[42px] w-24 items-center justify-center rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
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
			bind:currentModel
			bind:temperature
			bind:maxTokens
		/>
	</div>
</div>
