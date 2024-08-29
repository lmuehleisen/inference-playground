<script lang="ts">
	import type { ModelEntryWithTokenizer } from "./types";
	import { type ChatCompletionInputMessage } from "@huggingface/tasks";

	import { page } from "$app/stores";
	import { defaultGenerationConfig } from "./generationConfigSettings";
	import {
		createHfInference,
		handleStreamingResponse,
		handleNonStreamingResponse,
		isSystemPromptSupported,
		FEATUED_MODELS_IDS,
	} from "./inferencePlaygroundUtils";

	import { onDestroy, onMount } from "svelte";
	import GenerationConfig from "./InferencePlaygroundGenerationConfig.svelte";
	import HFTokenModal from "./InferencePlaygroundHFTokenModal.svelte";
	import ModelSelector from "./InferencePlaygroundModelSelector.svelte";
	import Conversation from "./InferencePlaygroundConversation.svelte";
	import IconDelete from "../Icons/IconDelete.svelte";
	import IconCode from "../Icons/IconCode.svelte";

	export let models: ModelEntryWithTokenizer[];

	const startMessageUser: ChatCompletionInputMessage = { role: "user", content: "" };
	const startMessageSystem: ChatCompletionInputMessage = { role: "system", content: "" };

	const modelIdFromQueryParam = $page.url.searchParams.get("modelId");
	const modelFromQueryParam = models.find(model => model.id === modelIdFromQueryParam);

	let conversation: Conversation = {
		model: modelFromQueryParam ?? models.find(m => FEATUED_MODELS_IDS.includes(m.id)) ?? models[0],
		config: defaultGenerationConfig,
		messages: [{ ...startMessageUser }],
		systemMessage: startMessageSystem,
		streaming: true,
	};

	let hfToken = "";
	let viewCode = false;
	let viewSettings = false;
	let showTokenModal = false;
	let loading = false;
	let latency = 0;
	let generatedTokensCount = 0;
	let abortController: AbortController | undefined = undefined;
	let waitForNonStreaming = true;
	let storeLocallyHfToken = false;

	const hfTokenLocalStorageKey = "hf-inference-token";

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
		let streamingMsgAdded = false;

		try {
			const startTime = performance.now();
			const hf = createHfInference(hfToken);

			if (conversation.streaming) {
				const streamingMessage = { role: "assistant", content: "" };
				conversation.messages = [...conversation.messages, streamingMessage];
				streamingMsgAdded = true;
				abortController = new AbortController();

				await handleStreamingResponse(
					hf,
					conversation,
					content => {
						if (streamingMessage) {
							streamingMessage.content = content;
							conversation.messages = [...conversation.messages];
							generatedTokensCount += 1;
						}
					},
					abortController
				);
			} else {
				waitForNonStreaming = true;
				const { message: newMessage, completion_tokens: newTokensCount } = await handleNonStreamingResponse(
					hf,
					conversation
				);
				// check if the user did not abort the request
				if (waitForNonStreaming) {
					conversation.messages = [...conversation.messages, newMessage];
					generatedTokensCount += newTokensCount;
				}
			}

			const endTime = performance.now();
			latency = Math.round(endTime - startTime);
		} catch (error) {
			if (streamingMsgAdded) {
				conversation.messages = conversation.messages.slice(0, -1);
			}
			if (error instanceof Error) {
				if (error.message.includes("token seems invalid")) {
					hfToken = "";
					localStorage.removeItem(hfTokenLocalStorageKey);
				}
				if (error.name !== "AbortError") {
					alert("error: " + error.message);
				}
			} else {
				alert("An unknown error occurred");
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
		const submittedHfToken = (formData.get("hf-token") as string).trim() ?? "";
		const RE_HF_TOKEN = /\bhf_[a-zA-Z0-9]{34}\b/;
		if (RE_HF_TOKEN.test(submittedHfToken)) {
			hfToken = submittedHfToken;
			if (storeLocallyHfToken) {
				localStorage.setItem(hfTokenLocalStorageKey, JSON.stringify(hfToken));
			}
			submit();
			showTokenModal = false;
		} else {
			alert("Please provide a valid HF token.");
		}
	}

	onMount(() => {
		const storedHfToken = localStorage.getItem(hfTokenLocalStorageKey);
		if (storedHfToken !== null) {
			hfToken = JSON.parse(storedHfToken);
		}
	});

	onDestroy(() => {
		abortController?.abort();
	});
</script>

{#if showTokenModal}
	<HFTokenModal bind:storeLocallyHfToken on:close={() => (showTokenModal = false)} on:submit={handleTokenSubmit} />
{/if}

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="w-dvh grid divide-gray-200 overflow-hidden bg-gray-100/50 max-md:divide-y h-dvh max-md:grid-rows-[120px,1fr] md:grid-cols-[clamp(220px,20%,350px),minmax(0,1fr),clamp(270px,25%,300px)] dark:divide-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:[color-scheme:dark]"
>
	<div class="flex flex-col overflow-y-auto py-3 max-md:pl-3 pr-3">
		<div
			class="relative flex flex-1 flex-col gap-6 overflow-y-hidden max-md:rounded-xl rounded-r-xl border-x border-y border-gray-200/80 bg-gradient-to-b from-white via-white p-3 shadow-sm dark:border-white/5 dark:from-gray-800/40 dark:via-gray-800/40"
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
				{hfToken}
				on:addMessage={addMessage}
				on:deleteMessage={e => deleteMessage(e.detail)}
			/>
		</div>
		<div
			class="fixed inset-x-0 bottom-0 flex h-20 items-center gap-2 overflow-hidden whitespace-nowrap px-3 md:absolute bg-white dark:bg-gray-900"
		>
		<button
		type="button"
		on:click={() => (viewSettings = !viewSettings)}
		class="md:hidden flex h-[39px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
	>
	<svg class="text-black dark:text-white" style="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" focusable="false" role="img" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path class="uim-quaternary" d="M20.23 7.24L12 12L3.77 7.24a1.98 1.98 0 0 1 .7-.71L11 2.76c.62-.35 1.38-.35 2 0l6.53 3.77c.29.173.531.418.7.71z" opacity=".25" fill="currentColor"></path><path class="uim-tertiary" d="M12 12v9.5a2.09 2.09 0 0 1-.91-.21L4.5 17.48a2.003 2.003 0 0 1-1-1.73v-7.5a2.06 2.06 0 0 1 .27-1.01L12 12z" opacity=".5" fill="currentColor"></path><path class="uim-primary" d="M20.5 8.25v7.5a2.003 2.003 0 0 1-1 1.73l-6.62 3.82c-.275.13-.576.198-.88.2V12l8.23-4.76c.175.308.268.656.27 1.01z" fill="currentColor"></path></svg>
		{!viewSettings ? "Settings" : "Hide Settings"}
		</button
	>
			<button
				type="button"
				on:click={reset}
				class="flex size-[39px] flex-none items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
			>
				<IconDelete />
			</button>
			<div class="flex-1 items-center justify-center text-center text-sm text-gray-500">
				<span class="max-xl:hidden">{generatedTokensCount} tokens · Latency {latency}ms</span>
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
	<div class="flex flex-col p-3 {viewSettings ? 'max-md:fixed' : 'max-md:hidden'} max-md:inset-x-0 max-md:bottom-20 ">
		<div
			class="flex flex-1 flex-col gap-6 overflow-y-hidden rounded-xl border bg-white dark:bg-gray-900 border-gray-200/80 bg-gradient-to-b from-white via-white p-3 shadow-sm dark:border-white/5 dark:from-gray-800/40 dark:via-gray-800/40"
		>
			<ModelSelector {models} bind:conversation />

			<GenerationConfig bind:conversation />
			<div class="mt-auto hidden">
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
