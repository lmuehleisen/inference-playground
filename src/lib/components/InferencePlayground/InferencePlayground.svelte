<script lang="ts">
	import type { ModelEntryWithTokenizer } from "./types";
	import { type ChatCompletionInputMessage } from "@huggingface/tasks";

	import { defaultGenerationConfig } from "./generationConfigSettings";
	import {
		createHfInference,
		handleStreamingResponse,
		handleNonStreamingResponse,
		isSystemPromptSupported,
		FEATUED_MODELS_IDS,
	} from "./inferencePlaygroundUtils";

	import { onDestroy } from "svelte";
	import GenerationConfig from "./InferencePlaygroundGenerationConfig.svelte";
	import HFTokenModal from "./InferencePlaygroundHFTokenModal.svelte";
	import ModelSelector from "./InferencePlaygroundModelSelector.svelte";
	import Conversation from "./InferencePlaygroundConversation.svelte";
	import IconDelete from "../Icons/IconDelete.svelte";
	import IconCode from "../Icons/IconCode.svelte";

	export let models: ModelEntryWithTokenizer[];

	const startMessageUser: ChatCompletionInputMessage = { role: "user", content: "" };
	const startMessageSystem: ChatCompletionInputMessage = { role: "system", content: "" };

	let conversation: Conversation = {
		model: models.find(m => FEATUED_MODELS_IDS.includes(m.id)) ?? models[0],
		config: defaultGenerationConfig,
		messages: [{ ...startMessageUser }],
		systemMessage: startMessageSystem,
		streaming: true,
	};

	let hfToken = "";
	let viewCode = false;
	let showTokenModal = false;
	let loading = false;
	let latency = 0;
	let abortController: AbortController | undefined = undefined;
	let waitForNonStreaming = true;

	$: systemPromptSupported = isSystemPromptSupported(conversation.model);

	function addMessage() {
		conversation.messages = [
			...conversation.messages,
			{
				role: conversation.messages.at(-1)?.role === "user" ? "assistant" : "user",
				content: "",
			},
		];
	}

	function deleteMessage(idx: number) {
		conversation.messages.splice(idx, 1)[0];
		conversation = conversation;
	}

	function reset() {
		conversation.systemMessage.content = "";
		conversation.messages = [{ ...startMessageUser }];
	}

	function abort() {
		abortController?.abort();
		abortController = undefined;
		loading = false;
		waitForNonStreaming = false;
	}

	async function submit() {
		if (!hfToken) {
			showTokenModal = true;
			return;
		}
		(document.activeElement as HTMLElement).blur();
		loading = true;

		try {
			const startTime = performance.now();
			const hf = createHfInference(hfToken);

			if (conversation.streaming) {
				const streamingMessage = { role: "assistant", content: "" };
				conversation.messages = [...conversation.messages, streamingMessage];
				abortController = new AbortController();

				await handleStreamingResponse(
					hf,
					conversation,
					content => {
						if (streamingMessage) {
							streamingMessage.content = content;
							conversation.messages = [...conversation.messages];
						}
					},
					abortController
				);
			} else {
				waitForNonStreaming = true;
				const newMessage = await handleNonStreamingResponse(hf, conversation);
				// check if the user did not abort the request
				if (waitForNonStreaming) {
					conversation.messages = [...conversation.messages, newMessage];
				}
			}

			const endTime = performance.now();
			latency = Math.round(endTime - startTime);
		} catch (error) {
			if (error.name !== "AbortError") {
				alert("error: " + (error as Error).message);
			}
		} finally {
			loading = false;
			abortController = undefined;
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
			submit();
		}
	}

	function handleTokenSubmit(e: Event) {
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		hfToken = (formData.get("hf-token") as string) ?? "";
		submit();
		showTokenModal = false;
	}

	onDestroy(() => {
		abortController?.abort();
	});
</script>

{#if showTokenModal}
	<HFTokenModal on:close={() => (showTokenModal = false)} on:submit={handleTokenSubmit} />
{/if}

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="w-dvh grid divide-gray-200 overflow-hidden bg-gray-100/50 max-md:divide-y md:h-dvh md:grid-cols-[clamp(220px,20%,350px),minmax(0,1fr),clamp(270px,25%,300px)] dark:divide-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:[color-scheme:dark]"
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
					? "Enter a custom prompt"
					: "System prompt is not supported with the chosen model."}
				value={systemPromptSupported ? conversation.systemMessage.content : ""}
				on:input={e => (conversation.systemMessage.content = e.currentTarget.value)}
				class="absolute inset-x-0 bottom-0 h-full resize-none bg-transparent px-3 pt-10 text-sm outline-none"
			></textarea>
		</div>
	</div>
	<div class="relative divide-y divide-gray-200 pt-3 dark:divide-gray-800" on:keydown={onKeydown}>
		<div class="flex h-[calc(100dvh-5rem)] divide-x divide-gray-200 *:w-full dark:divide-gray-800">
			<Conversation
				{loading}
				{conversation}
				index={0}
				{viewCode}
				on:addMessage={addMessage}
				on:deleteMessage={e => deleteMessage(e.detail)}
			/>
		</div>
		<div
			class="fixed inset-x-0 bottom-0 flex h-20 items-center gap-2 overflow-hidden whitespace-nowrap px-3 md:absolute"
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
				{!viewCode ? "View Code" : "Hide Code"}</button
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
					Run <span class="inline-flex gap-0.5 rounded border border-white/20 bg-white/10 px-0.5 text-xs text-white/70"
						>⌘<span class="translate-y-px">↵</span></span
					>
				{/if}
			</button>
		</div>
	</div>
	<div class="flex flex-col p-3">
		<div
			class="flex flex-1 flex-col gap-6 overflow-y-hidden rounded-xl border border-gray-200/80 bg-gradient-to-b from-white via-white p-3 shadow-sm dark:border-white/5 dark:from-gray-800/40 dark:via-gray-800/40"
		>
			<ModelSelector {models} bind:conversation />

			<GenerationConfig bind:conversation />
			<div class="mt-auto">
				<div class="mb-3 flex items-center justify-between gap-2">
					<label for="default-range" class="block text-sm font-medium text-gray-900 dark:text-white">API Quota</label>
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
</div>
