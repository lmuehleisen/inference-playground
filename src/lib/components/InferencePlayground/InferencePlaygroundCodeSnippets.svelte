<script lang="ts">
	import type { Conversation } from "$lib/types";

	import hljs from "highlight.js/lib/core";
	import http from "highlight.js/lib/languages/http";
	import javascript from "highlight.js/lib/languages/javascript";
	import python from "highlight.js/lib/languages/python";
	import { createEventDispatcher, onDestroy } from "svelte";

	import { token } from "$lib/stores/token";
	import type { InferenceProvider } from "@huggingface/inference";
	import IconCopyCode from "../Icons/IconCopyCode.svelte";
	import {
		getInferenceSnippet,
		type GetInferenceSnippetReturn,
		type InferenceSnippetLanguage,
	} from "./inferencePlaygroundUtils";

	hljs.registerLanguage("javascript", javascript);
	hljs.registerLanguage("python", python);
	hljs.registerLanguage("http", http);

	export let conversation: Conversation;

	const dispatch = createEventDispatcher<{ closeCode: void }>();

	const lanuages = ["javascript", "python", "http"];
	type Language = (typeof lanuages)[number];
	const labelsByLanguage: Record<Language, string> = {
		javascript: "JavaScript",
		python: "Python",
		http: "cURL",
	};

	let selectedLanguage: Language = "javascript";
	let timeout: ReturnType<typeof setTimeout>;
	let showToken = false;

	$: tokenStr = getTokenStr(showToken);

	type GetSnippetArgs = {
		tokenStr: string;
		conversation: Conversation;
		lang: InferenceSnippetLanguage;
	};
	function getSnippet({ tokenStr, conversation, lang }: GetSnippetArgs) {
		return getInferenceSnippet(conversation.model, conversation.provider as InferenceProvider, lang, tokenStr, {
			messages: conversation.messages,
		});
	}

	$: clientSnippetsByLang = {
		javascript: getSnippet({ lang: "js", tokenStr, conversation }),
		python: getSnippet({ lang: "python", tokenStr, conversation }),
		http: getSnippet({ lang: "curl", tokenStr, conversation }),
	} as Record<Language, GetInferenceSnippetReturn>;

	const selectedClientIdxByLang: Record<Language, number> = Object.fromEntries(lanuages.map(lang => [lang, 0]));

	function getTokenStr(showToken: boolean) {
		if ($token.value && showToken) {
			return $token.value;
		}
		return "YOUR_HF_TOKEN";
	}

	function highlight(code: string, language: Language) {
		return hljs.highlight(code, { language: language === "curl" ? "http" : language }).value;
	}

	onDestroy(() => {
		clearTimeout(timeout);
	});
</script>

<div class="px-2 pt-2">
	<div
		class="border-b border-gray-200 text-center text-sm font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400"
	>
		<ul class="-mb-px flex flex-wrap">
			{#each Object.entries(labelsByLanguage) as [language, label]}
				<li>
					<button
						on:click={() => (selectedLanguage = language)}
						class="inline-block rounded-t-lg border-b-2 p-4 {language === selectedLanguage
							? 'border-black text-black dark:border-blue-500 dark:text-blue-500'
							: 'border-transparent hover:border-gray-300 hover:text-gray-600 dark:hover:text-gray-300'}"
						aria-current="page">{label}</button
					>
				</li>
			{/each}
			<li class="ml-auto self-center max-sm:hidden">
				<button
					on:click={() => {
						dispatch("closeCode");
					}}
					class="flex size-7 items-center justify-center rounded-lg px-3 py-2.5 text-xs font-medium text-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-hidden dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
				>
					✕
				</button>
			</li>
		</ul>
	</div>

	{#if (clientSnippetsByLang[selectedLanguage]?.length ?? 0) > 1}
		<div class="flex gap-x-2 px-2 pt-6">
			{#each clientSnippetsByLang[selectedLanguage] ?? [] as { client }, idx}
				{@const isActive = idx === selectedClientIdxByLang[selectedLanguage]}
				<button
					class="rounded-lg border px-1.5 py-0.5 text-sm leading-tight
					{isActive
						? 'bg-black text-gray-100 dark:border-gray-500 dark:bg-gray-700 dark:text-white'
						: 'text-gray-500 hover:text-gray-600 dark:border-gray-600 dark:hover:text-gray-400'}"
					on:click={() => (selectedClientIdxByLang[selectedLanguage] = idx)}>{client}</button
				>
			{/each}
		</div>
	{/if}

	{#each clientSnippetsByLang[selectedLanguage] ?? [] as { language, content }, idx}
		{#if idx === selectedClientIdxByLang[selectedLanguage]}
			<div class="flex items-center justify-end px-2 pt-6 pb-4">
				<div class="flex items-center gap-x-4">
					<label class="flex items-center gap-x-1.5 text-sm select-none">
						<input type="checkbox" bind:checked={showToken} />
						<p class="leading-none">With token</p>
					</label>
					<button
						class="flex items-center gap-x-2 rounded-md border bg-white px-1.5 py-0.5 text-sm shadow-xs transition dark:border-gray-800 dark:bg-gray-800"
						on:click={e => {
							const el = e.currentTarget;
							el.classList.add("text-green-500");
							navigator.clipboard.writeText(content);
							if (timeout) {
								clearTimeout(timeout);
							}
							timeout = setTimeout(() => {
								el.classList.remove("text-green-500");
							}, 400);
						}}
					>
						<IconCopyCode classNames="text-xs" /> Copy code
					</button>
				</div>
			</div>
			<pre
				class="overflow-x-auto rounded-lg border border-gray-200/80 bg-white px-4 py-6 text-sm shadow-xs dark:border-gray-800 dark:bg-gray-800/50">{@html highlight(
					content,
					language ?? selectedLanguage
				)}</pre>
		{/if}
	{/each}
</div>
