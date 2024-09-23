<script lang="ts">
	import type { Conversation, ModelEntryWithTokenizer } from "./types";
	import type { ChatCompletionInputMessage } from "@huggingface/tasks";

	import { page } from "$app/stores";
	import { defaultGenerationConfig } from "./generationConfigSettings";
	import {
		createHfInference,
		handleStreamingResponse,
		handleNonStreamingResponse,
		isSystemPromptSupported,
		FEATURED_MODELS_IDS,
	} from "./inferencePlaygroundUtils";

	import { onDestroy, onMount } from "svelte";
	import GenerationConfig from "./InferencePlaygroundGenerationConfig.svelte";
	import HFTokenModal from "./InferencePlaygroundHFTokenModal.svelte";
	import ModelSelector from "./InferencePlaygroundModelSelector.svelte";
	import PlaygroundConversation from "./InferencePlaygroundConversation.svelte";
	import IconDelete from "../Icons/IconDelete.svelte";
	import IconCode from "../Icons/IconCode.svelte";
	import IconInfo from "../Icons/IconInfo.svelte";

	export let models: ModelEntryWithTokenizer[];

	const startMessageUser: ChatCompletionInputMessage = { role: "user", content: "" };
	const startMessageSystem: ChatCompletionInputMessage = { role: "system", content: "" };

	const modelIdFromQueryParam = $page.url.searchParams.get("modelId");
	const modelFromQueryParam = models.find(model => model.id === modelIdFromQueryParam);

	let conversation: Conversation = {
		model: modelFromQueryParam ?? models.find(m => FEATURED_MODELS_IDS.includes(m.id)) ?? models[0],
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
	let storeLocallyHfToken = true;

	const hfTokenLocalStorageKey = "hf_token";

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

		if (conversation.messages.at(-1)?.role === "assistant") {
			return alert("Messages must alternate between user/assistant roles.");
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
			if (conversation.messages.at(-1)?.role === "assistant" && !conversation.messages.at(-1)?.content?.trim()) {
				conversation.messages.pop();
				conversation.messages = [...conversation.messages];
			}
			if (error instanceof Error) {
				if (error.message.includes("token seems invalid")) {
					hfToken = "";
					localStorage.removeItem(hfTokenLocalStorageKey);
					showTokenModal = true;
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
	class="w-dvh grid h-dvh divide-gray-200 overflow-hidden bg-gray-100/50 max-md:grid-rows-[120px,1fr] max-md:divide-y md:grid-cols-[clamp(220px,20%,350px),minmax(0,1fr),clamp(270px,25%,300px)] dark:divide-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:[color-scheme:dark]"
>
	<div class="flex flex-col overflow-y-auto py-3 pr-3 max-md:pl-3">
		<div
			class="relative flex flex-1 flex-col gap-6 overflow-y-hidden rounded-r-xl border-x border-y border-gray-200/80 bg-gradient-to-b from-white via-white p-3 shadow-sm max-md:rounded-xl dark:border-white/5 dark:from-gray-800/40 dark:via-gray-800/40"
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
	<div class="relative divide-y divide-gray-200 dark:divide-gray-800" on:keydown={onKeydown}>
		<div
			class="flex h-[calc(100dvh-5rem-120px)] divide-x divide-gray-200 *:w-full md:h-[calc(100dvh-5rem)] md:pt-3 dark:divide-gray-800"
		>
			<PlaygroundConversation
				{loading}
				{conversation}
				{viewCode}
				{hfToken}
				on:addMessage={addMessage}
				on:deleteMessage={e => deleteMessage(e.detail)}
			/>
		</div>
		<div
			class="fixed inset-x-0 bottom-0 flex h-20 items-center gap-2 overflow-hidden whitespace-nowrap px-3 md:absolute"
		>
			<button
				type="button"
				on:click={() => (viewSettings = !viewSettings)}
				class="flex h-[39px] items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 md:hidden dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
			>
				<svg
					class="text-black dark:text-white"
					style=""
					xmlns="http://www.w3.org/2000/svg"
					xmlns:xlink="http://www.w3.org/1999/xlink"
					aria-hidden="true"
					focusable="false"
					role="img"
					width="1em"
					height="1em"
					preserveAspectRatio="xMidYMid meet"
					viewBox="0 0 24 24"
					><path
						fill="currentColor"
						d="M2.131 13.63a10 10 0 0 1 .001-3.26c1.101.026 2.092-.502 2.477-1.431c.385-.93.058-2.003-.74-2.763a10 10 0 0 1 2.306-2.307c.76.798 1.834 1.125 2.763.74c.93-.385 1.458-1.376 1.431-2.477a10 10 0 0 1 3.261 0c-.026 1.102.502 2.092 1.431 2.477c.93.385 2.003.058 2.763-.74a10 10 0 0 1 2.307 2.306c-.798.76-1.125 1.834-.74 2.764s1.376 1.458 2.477 1.43a10 10 0 0 1 0 3.262c-1.102-.027-2.092.501-2.477 1.43c-.385.93-.058 2.004.74 2.764a10 10 0 0 1-2.306 2.306c-.76-.798-1.834-1.125-2.764-.74s-1.458 1.376-1.43 2.478a10 10 0 0 1-3.262-.001c.027-1.101-.502-2.092-1.43-2.477c-.93-.385-2.004-.058-2.764.74a10 10 0 0 1-2.306-2.306c.798-.76 1.125-1.834.74-2.763c-.385-.93-1.376-1.458-2.478-1.431M12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6"
					/></svg
				>
				{!viewSettings ? "Settings" : "Hide Settings"}
			</button>
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
						<span class="mr-2">
							{#if conversation.streaming}
								Stop
							{:else}
								Cancel
							{/if}
						</span>
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
	<div class="flex flex-col p-3 {viewSettings ? 'max-md:fixed' : 'max-md:hidden'} max-md:inset-x-0 max-md:bottom-20">
		<div
			class="flex flex-1 flex-col gap-6 overflow-y-hidden rounded-xl border border-gray-200/80 bg-white bg-gradient-to-b from-white via-white p-3 shadow-sm dark:border-white/5 dark:bg-gray-900 dark:from-gray-800/40 dark:via-gray-800/40"
		>
			<div class="flex flex-col gap-2">
				<ModelSelector {models} bind:conversation />
				<div class="self-end text-xs">
					<a
						href="https://huggingface.co/{conversation.model.id}"
						target="_blank"
						class="flex items-center gap-0.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-400"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32"
							><path fill="currentColor" d="M10 6v2h12.59L6 24.59L7.41 26L24 9.41V22h2V6H10z" /></svg
						>
						Model page
					</a>
				</div>
			</div>

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

<a
	target="_blank"
	href="https://huggingface.co/spaces/huggingface/inference-playground/discussions/1"
	class="absolute bottom-6 left-4 flex items-center gap-1 text-sm text-gray-500 underline decoration-gray-300 hover:text-gray-800 max-md:hidden dark:text-gray-400 dark:decoration-gray-600 dark:hover:text-gray-200"
>
	<IconInfo classNames="text-xs" />
	Give feedback
</a>
