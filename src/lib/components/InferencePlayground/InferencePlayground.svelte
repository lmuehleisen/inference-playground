<script lang="ts">
	import type { Conversation, ConversationMessage, ModelEntryWithTokenizer, Session } from "./types";

	import { page } from "$app/stores";
	import { defaultGenerationConfig } from "./generationConfigSettings";
	import {
		createHfInference,
		FEATURED_MODELS_IDS,
		handleNonStreamingResponse,
		handleStreamingResponse,
		isSystemPromptSupported,
	} from "./inferencePlaygroundUtils";

	import { goto } from "$app/navigation";
	import { models } from "$lib/stores/models";
	import { isMac } from "$lib/utils/platform";
	import { onDestroy, onMount } from "svelte";
	import IconCode from "../Icons/IconCode.svelte";
	import IconCompare from "../Icons/IconCompare.svelte";
	import IconDelete from "../Icons/IconDelete.svelte";
	import IconInfo from "../Icons/IconInfo.svelte";
	import IconThrashcan from "../Icons/IconThrashcan.svelte";
	import PlaygroundConversation from "./InferencePlaygroundConversation.svelte";
	import PlaygroundConversationHeader from "./InferencePlaygroundConversationHeader.svelte";
	import GenerationConfig, { defaultSystemMessage } from "./InferencePlaygroundGenerationConfig.svelte";
	import HFTokenModal from "./InferencePlaygroundHFTokenModal.svelte";
	import ModelSelector from "./InferencePlaygroundModelSelector.svelte";
	import ModelSelectorModal from "./InferencePlaygroundModelSelectorModal.svelte";

	const startMessageUser: ConversationMessage = { role: "user", content: "" };
	const modelIdsFromQueryParam = $page.url.searchParams.get("modelId")?.split(",");
	const modelsFromQueryParam = modelIdsFromQueryParam?.map(id => $models.find(model => model.id === id));
	const systemMessage: ConversationMessage = {
		role: "system",
		content: modelIdsFromQueryParam ? (defaultSystemMessage?.[modelIdsFromQueryParam[0]] ?? "") : "",
	};

	let session: Session = {
		conversations: [
			{
				model: $models.find(m => FEATURED_MODELS_IDS.includes(m.id)) ?? $models[0],
				config: { ...defaultGenerationConfig },
				messages: [{ ...startMessageUser }],
				systemMessage,
				streaming: true,
			},
		],
	};

	if (modelsFromQueryParam?.length) {
		const conversations = modelsFromQueryParam.map(model => {
			return {
				model,
				config: { ...defaultGenerationConfig },
				messages: [{ ...startMessageUser }],
				systemMessage,
				streaming: true,
			};
		}) as [Conversation] | [Conversation, Conversation];
		session.conversations = conversations;
		session = session;
	}

	let hfToken = "";
	let viewCode = false;
	let viewSettings = false;
	let showTokenModal = false;
	let loading = false;
	let abortControllers: AbortController[] = [];
	let waitForNonStreaming = true;
	let storeLocallyHfToken = true;
	let selectCompareModelOpen = false;

	interface GenerationStatistics {
		latency: number;
		generatedTokensCount: number;
	}
	let generationStats = session.conversations.map(_ => ({ latency: 0, generatedTokensCount: 0 })) as
		| [GenerationStatistics]
		| [GenerationStatistics, GenerationStatistics];

	const hfTokenLocalStorageKey = "hf_token";

	$: systemPromptSupported = session.conversations.some(conversation => isSystemPromptSupported(conversation.model));
	$: compareActive = session.conversations.length === 2;

	function addMessage(conversationIdx: number) {
		const conversation = session.conversations[conversationIdx];
		conversation.messages = [
			...conversation.messages,
			{
				role: conversation.messages.at(-1)?.role === "user" ? "assistant" : "user",
				content: "",
			},
		];
		session = session;
	}

	function deleteMessage(conversationIdx: number, idx: number) {
		session.conversations[conversationIdx].messages.splice(idx, 1)[0];
		session = session;
	}

	function reset() {
		session.conversations.map(conversation => {
			conversation.systemMessage.content = "";
			conversation.messages = [{ ...startMessageUser }];
		});
		session = session;
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

	function resetToken() {
		hfToken = "";
		localStorage.removeItem(hfTokenLocalStorageKey);
		showTokenModal = true;
	}

	async function runInference(conversation: Conversation, conversationIdx: number) {
		const startTime = performance.now();
		const hf = createHfInference(hfToken);

		if (conversation.streaming) {
			let addStreamingMessage = true;
			const streamingMessage = { role: "assistant", content: "" };
			const abortController = new AbortController();
			abortControllers.push(abortController);

			await handleStreamingResponse(
				hf,
				conversation,
				content => {
					if (streamingMessage) {
						streamingMessage.content = content;
						if (addStreamingMessage) {
							conversation.messages = [...conversation.messages, streamingMessage];
							addStreamingMessage = false;
						}
						session = session;
						generationStats[conversationIdx].generatedTokensCount += 1;
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
				generationStats[conversationIdx].generatedTokensCount += newTokensCount;
			}
		}

		const endTime = performance.now();
		generationStats[conversationIdx].latency = Math.round(endTime - startTime);
	}

	async function submit() {
		if (!hfToken) {
			showTokenModal = true;
			return;
		}

		for (const [idx, conversation] of session.conversations.entries()) {
			if (conversation.messages.at(-1)?.role === "assistant") {
				let prefix = "";
				if (session.conversations.length === 2) {
					prefix = `Error on ${idx === 0 ? "left" : "right"} conversation. `;
				}
				return alert(`${prefix}Messages must alternate between user/assistant roles.`);
			}
		}

		(document.activeElement as HTMLElement).blur();
		loading = true;

		try {
			const promises = session.conversations.map((conversation, idx) => runInference(conversation, idx));
			await Promise.all(promises);
		} catch (error) {
			for (const conversation of session.conversations) {
				if (conversation.messages.at(-1)?.role === "assistant" && !conversation.messages.at(-1)?.content?.trim()) {
					conversation.messages.pop();
					conversation.messages = [...conversation.messages];
				}
				session = session;
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
			abortControllers = [];
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

	function addCompareModel(modelId: ModelEntryWithTokenizer["id"]) {
		const model = $models.find(m => m.id === modelId);
		if (!model || session.conversations.length === 2) {
			return;
		}
		const newConversation = { ...JSON.parse(JSON.stringify(session.conversations[0])), model };
		session.conversations = [...session.conversations, newConversation];
		generationStats = [generationStats[0], { latency: 0, generatedTokensCount: 0 }];

		// update query param
		const url = new URL($page.url);
		const queryParamValue = `${session.conversations[0].model.id},${modelId}`;
		url.searchParams.set("modelId", queryParamValue);

		const parentOrigin = "https://huggingface.co";
		window.parent.postMessage({ queryString: `modelId=${queryParamValue}` }, parentOrigin);
		goto(url.toString(), { replaceState: true });
	}

	function removeCompareModal(conversationIdx: number) {
		session.conversations.splice(conversationIdx, 1)[0];
		session = session;
		generationStats.splice(conversationIdx, 1)[0];
		generationStats = generationStats;

		// update query param
		const url = new URL($page.url);
		const queryParamValue = url.searchParams.get("modelId");
		if (queryParamValue) {
			const modelIds = queryParamValue.split(",") as [string, string];
			const newQueryParamValue = conversationIdx === 1 ? modelIds[0] : modelIds[1];
			url.searchParams.set("modelId", newQueryParamValue);

			const parentOrigin = "https://huggingface.co";
			window.parent.postMessage({ queryString: `modelId=${newQueryParamValue}` }, parentOrigin);
			goto(url.toString(), { replaceState: true });
		}
	}

	onMount(() => {
		const storedHfToken = localStorage.getItem(hfTokenLocalStorageKey);
		if (storedHfToken !== null) {
			hfToken = JSON.parse(storedHfToken);
		}
	});

	onDestroy(() => {
		for (const abortController of abortControllers) {
			abortController.abort();
		}
	});
</script>

{#if showTokenModal}
	<HFTokenModal bind:storeLocallyHfToken on:close={() => (showTokenModal = false)} on:submit={handleTokenSubmit} />
{/if}

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="grid h-dvh divide-gray-200 overflow-hidden bg-gray-100/50 max-md:grid-rows-[120px_1fr] max-md:divide-y dark:divide-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:[color-scheme:dark] {compareActive
		? 'md:grid-cols-[clamp(220px,20%,350px)_minmax(0,1fr)]'
		: 'md:grid-cols-[clamp(220px,20%,350px)_minmax(0,1fr)_clamp(270px,25%,300px)]'}"
>
	<div class="flex flex-col overflow-y-auto py-3 pr-3 max-md:pl-3">
		<div
			class="relative flex flex-1 flex-col gap-6 overflow-y-hidden rounded-r-xl border-x border-y border-gray-200/80 bg-linear-to-b from-white via-white p-3 shadow-xs max-md:rounded-xl dark:border-white/5 dark:from-gray-800/40 dark:via-gray-800/40"
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
				value={systemPromptSupported ? session.conversations[0].systemMessage.content : ""}
				on:input={e => {
					for (const conversation of session.conversations) {
						conversation.systemMessage.content = e.currentTarget.value;
					}
					session = session;
				}}
				class="absolute inset-x-0 bottom-0 h-full resize-none bg-transparent px-3 pt-10 text-sm outline-hidden"
			></textarea>
		</div>
	</div>
	<div class="relative divide-y divide-gray-200 dark:divide-gray-800" on:keydown={onKeydown}>
		<div
			class="flex h-[calc(100dvh-5rem-120px)] divide-x divide-gray-200 overflow-x-auto overflow-y-hidden *:w-full max-sm:w-dvw md:h-[calc(100dvh-5rem)] md:pt-3 dark:divide-gray-800"
		>
			{#each session.conversations as conversation, conversationIdx}
				<div class="max-sm:min-w-full">
					{#if compareActive}
						<PlaygroundConversationHeader
							{conversationIdx}
							bind:conversation
							on:close={() => removeCompareModal(conversationIdx)}
						/>
					{/if}
					<PlaygroundConversation
						{loading}
						{conversation}
						{viewCode}
						{hfToken}
						{compareActive}
						on:addMessage={() => addMessage(conversationIdx)}
						on:deleteMessage={e => deleteMessage(conversationIdx, e.detail)}
						on:closeCode={() => (viewCode = false)}
					/>
				</div>
			{/each}
		</div>
		<div
			class="fixed inset-x-0 bottom-0 flex h-20 items-center justify-center gap-2 overflow-hidden px-3 whitespace-nowrap md:absolute"
		>
			<div class="flex flex-1 justify-start gap-x-2">
				{#if !compareActive}
					<button
						type="button"
						on:click={() => (viewSettings = !viewSettings)}
						class="flex h-[39px] items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 focus:outline-hidden md:hidden dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
					>
						<IconThrashcan classNames="text-black dark:text-white" />
						{!viewSettings ? "Settings" : "Hide Settings"}
					</button>
				{/if}
				<button
					type="button"
					on:click={reset}
					class="flex size-[39px] flex-none items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 focus:outline-hidden dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
				>
					<IconDelete />
				</button>
			</div>
			<div class="flex flex-1 shrink-0 items-center justify-center gap-x-8 text-center text-sm text-gray-500">
				{#each generationStats as { latency, generatedTokensCount }}
					<span class="max-xl:hidden">{generatedTokensCount} tokens · Latency {latency}ms</span>
				{/each}
			</div>
			<div class="flex flex-1 justify-end gap-x-2">
				<button
					type="button"
					on:click={() => (viewCode = !viewCode)}
					class="flex h-[39px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 focus:outline-hidden dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
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
					class="flex h-[39px] w-24 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white focus:ring-4 focus:ring-gray-300 focus:outline-hidden dark:border-gray-700 dark:focus:ring-gray-700 {loading
						? 'bg-red-900 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700'
						: 'bg-black hover:bg-gray-900 dark:bg-blue-600 dark:hover:bg-blue-700'}"
				>
					{#if loading}
						<div class="flex flex-none items-center gap-[3px]">
							<span class="mr-2">
								{#if session.conversations[0].streaming || session.conversations[1]?.streaming}
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
						Run <span
							class="inline-flex gap-0.5 rounded-sm border border-white/20 bg-white/10 px-0.5 text-xs text-white/70"
							>{isMac() ? "⌘" : "Ctrl"}<span class="translate-y-px">↵</span></span
						>
					{/if}
				</button>
			</div>
		</div>
	</div>
	{#if !compareActive}
		<div class="flex flex-col p-3 {viewSettings ? 'max-md:fixed' : 'max-md:hidden'} max-md:inset-x-0 max-md:bottom-20">
			<div
				class="flex flex-1 flex-col gap-6 overflow-y-hidden rounded-xl border border-gray-200/80 bg-white bg-linear-to-b from-white via-white p-3 shadow-xs dark:border-white/5 dark:bg-gray-900 dark:from-gray-800/40 dark:via-gray-800/40"
			>
				<div class="flex flex-col gap-2">
					<ModelSelector bind:conversation={session.conversations[0]} />
					<div class="flex items-center gap-2 self-end px-2 text-xs whitespace-nowrap">
						<button
							class="flex items-center gap-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
							on:click={() => (selectCompareModelOpen = true)}
						>
							<IconCompare />
							Compare
						</button>
						<a
							href="https://huggingface.co/{session.conversations[0].model.id}"
							target="_blank"
							class="flex items-center gap-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32"
								><path fill="currentColor" d="M10 6v2h12.59L6 24.59L7.41 26L24 9.41V22h2V6H10z" /></svg
							>
							Model page
						</a>
					</div>
				</div>

				<GenerationConfig bind:conversation={session.conversations[0]} />
				{#if hfToken}
					<button
						on:click={resetToken}
						class="mt-auto flex items-center gap-1 self-end text-sm text-gray-500 underline decoration-gray-300 hover:text-gray-800 dark:text-gray-400 dark:decoration-gray-600 dark:hover:text-gray-200"
						><svg xmlns="http://www.w3.org/2000/svg" class="text-xs" width="1em" height="1em" viewBox="0 0 32 32"
							><path
								fill="currentColor"
								d="M23.216 4H26V2h-7v6h2V5.096A11.96 11.96 0 0 1 28 16c0 6.617-5.383 12-12 12v2c7.72 0 14-6.28 14-14c0-5.009-2.632-9.512-6.784-12"
							/><path fill="currentColor" d="M16 20a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3M15 9h2v9h-2z" /><path
								fill="currentColor"
								d="M16 4V2C8.28 2 2 8.28 2 16c0 4.977 2.607 9.494 6.784 12H6v2h7v-6h-2v2.903A11.97 11.97 0 0 1 4 16C4 9.383 9.383 4 16 4"
							/></svg
						>
						Reset token</button
					>
				{/if}
				<div class="mt-auto hidden">
					<div class="mb-3 flex items-center justify-between gap-2">
						<label for="default-range" class="block text-sm font-medium text-gray-900 dark:text-white">API Quota</label>
						<span
							class="rounded-sm bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300"
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

<div class="absolute bottom-6 left-4 flex items-center gap-2 max-md:hidden">
	<a
		target="_blank"
		href="https://huggingface.co/docs/api-inference/tasks/chat-completion"
		class="flex items-center gap-1 text-sm text-gray-500 underline decoration-gray-300 hover:text-gray-800 dark:text-gray-400 dark:decoration-gray-600 dark:hover:text-gray-200"
	>
		<IconInfo classNames="text-xs" />
		View Docs
	</a>
	<span class="dark:text-gray-500">·</span>
	<a
		target="_blank"
		href="https://huggingface.co/spaces/huggingface/inference-playground/discussions/1"
		class="flex items-center gap-1 text-sm text-gray-500 underline decoration-gray-300 hover:text-gray-800 dark:text-gray-400 dark:decoration-gray-600 dark:hover:text-gray-200"
	>
		Give feedback
	</a>
</div>

{#if selectCompareModelOpen}
	<ModelSelectorModal
		conversation={session.conversations[0]}
		on:modelSelected={e => addCompareModel(e.detail)}
		on:close={() => (selectCompareModelOpen = false)}
	/>
{/if}
