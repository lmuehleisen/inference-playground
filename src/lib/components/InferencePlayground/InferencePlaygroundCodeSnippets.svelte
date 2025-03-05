<script lang="ts">
	import type { Conversation } from "./types";

	import { createEventDispatcher, onDestroy } from "svelte";
	import hljs from "highlight.js/lib/core";
	import javascript from "highlight.js/lib/languages/javascript";
	import python from "highlight.js/lib/languages/python";
	import http from "highlight.js/lib/languages/http";

	import IconCopyCode from "../Icons/IconCopyCode.svelte";
	import { isSystemPromptSupported } from "./inferencePlaygroundUtils";
	import { token } from "$lib/stores/token";

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
		http: "Curl",
	};

	interface Snippet {
		label: string;
		code: string;
		language?: Language;
		needsToken?: boolean;
	}

	interface ClientSnippet {
		name: string;
		snippets: Snippet[];
	}

	interface MessagesJoiner {
		sep: string;
		start: string;
		end: string;
	}

	let selectedLanguage: Language = "javascript";
	let timeout: ReturnType<typeof setTimeout>;
	let showToken = false;

	$: tokenStr = getTokenStr(showToken);

	$: clientSnippetsByLang = {
		javascript: [
			{ name: "@huggingface/inference", snippets: getJavascriptSnippetsHfClient(conversation, tokenStr) },
			{ name: "openai", snippets: getJavascriptSnippetsOAIClient(conversation, tokenStr) },
		],
		python: [
			{ name: "huggingface_hub", snippets: getPythonSnippetsHfClient(conversation, tokenStr) },
			{ name: "openai", snippets: getPythonSnippetsOAIClient(conversation, tokenStr) },
		],
		http: [{ name: "curl", snippets: getHttpSnippets(conversation, tokenStr) }],
	} as Record<Language, ClientSnippet[]>;

	const selectedClientIdxByLang: Record<Language, number> = Object.fromEntries(lanuages.map(lang => [lang, 0]));

	function getTokenStr(showToken: boolean) {
		if ($token.value && showToken) {
			return $token.value;
		}
		return "YOUR_HF_TOKEN";
	}

	function getMessages() {
		const placeholder = [{ role: "user", content: "Tell me a story" }];

		let messages = [...conversation.messages];
		if (messages.length === 1 && messages[0]?.role === "user" && !messages[0]?.content) {
			messages = placeholder;
		}

		const { model, systemMessage } = conversation;
		if (isSystemPromptSupported(model) && systemMessage.content?.length) {
			messages.unshift(systemMessage);
		}

		const res = messages.map(({ role, content }) => ({
			role,
			content: JSON.stringify(content).slice(1, -1),
		}));
		messages = res;

		return res;
	}

	function highlight(code: string, language: Language) {
		return hljs.highlight(code, { language }).value;
	}

	function getJavascriptSnippetsHfClient(conversation: Conversation, tokenStr: string) {
		const formattedMessages = ({ sep, start, end }: MessagesJoiner) =>
			start +
			getMessages()
				.map(({ role, content }) => `{ role: "${role}", content: "${content}" }`)
				.join(sep) +
			end;

		const formattedConfig = ({ sep, start, end }: MessagesJoiner) =>
			start +
			Object.entries(conversation.config)
				.map(([key, val]) => `${key}: ${val}`)
				.join(sep) +
			end;

		const snippets: Snippet[] = [];
		snippets.push({
			label: "Install @huggingface/inference",
			language: "http",
			code: `npm install --save @huggingface/inference`,
		});
		if (conversation.streaming) {
			snippets.push({
				label: "Streaming API",
				needsToken: true,
				code: `import { HfInference } from "@huggingface/inference"

const client = new HfInference("${tokenStr}")

let out = "";

const stream = client.chatCompletionStream({
	model: "${conversation.model.id}",
	messages: ${formattedMessages({ sep: ",\n\t\t", start: "[\n\t\t", end: "\n\t]" })},
	${formattedConfig({ sep: ",\n\t", start: "", end: "" })}
});

for await (const chunk of stream) {
	if (chunk.choices && chunk.choices.length > 0) {
		const newContent = chunk.choices[0].delta.content;
		out += newContent;
		console.log(newContent);
	}
}`,
			});
		} else {
			// non-streaming
			snippets.push({
				label: "Non-Streaming API",
				needsToken: true,
				code: `import { HfInference } from '@huggingface/inference'

const client = new HfInference("${tokenStr}")

const chatCompletion = await client.chatCompletion({
	model: "${conversation.model.id}",
	messages: ${formattedMessages({ sep: ",\n\t\t", start: "[\n\t\t", end: "\n\t]" })},
	${formattedConfig({ sep: ",\n\t", start: "", end: "" })}
});

console.log(chatCompletion.choices[0].message);`,
			});
		}

		return snippets;
	}

	function getJavascriptSnippetsOAIClient(conversation: Conversation, tokenStr: string) {
		const formattedMessages = ({ sep, start, end }: MessagesJoiner) =>
			start +
			getMessages()
				.map(({ role, content }) => `{ role: "${role}", content: "${content}" }`)
				.join(sep) +
			end;

		const formattedConfig = ({ sep, start, end }: MessagesJoiner) =>
			start +
			Object.entries(conversation.config)
				.map(([key, val]) => `${key}: ${val}`)
				.join(sep) +
			end;

		const snippets: Snippet[] = [];
		snippets.push({
			label: "Install openai",
			language: "http",
			code: `npm install --save openai`,
		});
		if (conversation.streaming) {
			snippets.push({
				label: "Streaming API",
				needsToken: true,
				code: `import { OpenAI } from "openai"

const client = new OpenAI({
	baseURL: "https://api-inference.huggingface.co/v1/",
    apiKey: "${tokenStr}"
})

let out = "";

const stream = await client.chat.completions.create({
	model: "${conversation.model.id}",
	messages: ${formattedMessages({ sep: ",\n\t\t", start: "[\n\t\t", end: "\n\t]" })},
	${formattedConfig({ sep: ",\n\t", start: "", end: "" })},
	stream: true,
});

for await (const chunk of stream) {
	if (chunk.choices && chunk.choices.length > 0) {
		const newContent = chunk.choices[0].delta.content;
		out += newContent;
		console.log(newContent);
	}
}`,
			});
		} else {
			// non-streaming
			snippets.push({
				label: "Non-Streaming API",
				needsToken: true,
				code: `import { OpenAI } from "openai"

const client = new OpenAI({
    baseURL: "https://api-inference.huggingface.co/v1/",
    apiKey: "${tokenStr}"
})

const chatCompletion = await client.chat.completions.create({
	model: "${conversation.model.id}",
	messages: ${formattedMessages({ sep: ",\n\t\t", start: "[\n\t\t", end: "\n\t]" })},
	${formattedConfig({ sep: ",\n\t", start: "", end: "" })}
});

console.log(chatCompletion.choices[0].message);`,
			});
		}

		return snippets;
	}

	function getPythonSnippetsHfClient(conversation: Conversation, tokenStr: string) {
		const formattedMessages = ({ sep, start, end }: MessagesJoiner) =>
			start +
			getMessages()
				.map(({ role, content }) => `{ "role": "${role}", "content": "${content}" }`)
				.join(sep) +
			end;

		const formattedConfig = ({ sep, start, end, connector }: MessagesJoiner & { connector: string }) =>
			start +
			Object.entries(conversation.config)
				.map(([key, val]) => `${key}${connector}${val}`)
				.join(sep) +
			end;

		const snippets: Snippet[] = [];
		snippets.push({
			label: "Install the latest huggingface_hub",
			language: "http",
			code: `pip install huggingface_hub --upgrade`,
		});
		if (conversation.streaming) {
			snippets.push({
				label: "Streaming API",
				needsToken: true,
				code: `from huggingface_hub import InferenceClient

client = InferenceClient(api_key="${tokenStr}")

messages = ${formattedMessages({ sep: ",\n\t", start: `[\n\t`, end: `\n]` })}

stream = client.chat.completions.create(
    model="${conversation.model.id}",
	messages=messages,
	${formattedConfig({ sep: ",\n\t", start: "", end: "", connector: "=" })},
	stream=True
)

for chunk in stream:
    print(chunk.choices[0].delta.content)`,
			});
		} else {
			// non-streaming
			snippets.push({
				label: "Non-Streaming API",
				needsToken: true,
				code: `from huggingface_hub import InferenceClient

client = InferenceClient(api_key="${tokenStr}")

messages = ${formattedMessages({ sep: ",\n\t", start: `[\n\t`, end: `\n]` })}

completion = client.chat.completions.create(
    model="${conversation.model.id}",
	messages=messages,
	${formattedConfig({ sep: ",\n\t", start: "", end: "", connector: "=" })}
)

print(completion.choices[0].message)`,
			});
		}

		return snippets;
	}

	function getPythonSnippetsOAIClient(conversation: Conversation, tokenStr: string) {
		const formattedMessages = ({ sep, start, end }: MessagesJoiner) =>
			start +
			getMessages()
				.map(({ role, content }) => `{ "role": "${role}", "content": "${content}" }`)
				.join(sep) +
			end;

		const formattedConfig = ({ sep, start, end, connector }: MessagesJoiner & { connector: string }) =>
			start +
			Object.entries(conversation.config)
				.map(([key, val]) => `${key}${connector}${val}`)
				.join(sep) +
			end;

		const snippets: Snippet[] = [];
		snippets.push({
			label: "Install the latest openai",
			language: "http",
			code: `pip install openai --upgrade`,
		});
		if (conversation.streaming) {
			snippets.push({
				label: "Streaming API",
				needsToken: true,
				code: `from openai import OpenAI

client = OpenAI(
	base_url="https://api-inference.huggingface.co/v1/",
	api_key="${tokenStr}"
)

messages = ${formattedMessages({ sep: ",\n\t", start: `[\n\t`, end: `\n]` })}

stream = client.chat.completions.create(
    model="${conversation.model.id}",
	messages=messages,
	${formattedConfig({ sep: ",\n\t", start: "", end: "", connector: "=" })},
	stream=True
)

for chunk in stream:
    print(chunk.choices[0].delta.content)`,
			});
		} else {
			// non-streaming
			snippets.push({
				label: "Non-Streaming API",
				needsToken: true,
				code: `from openai import OpenAI

client = OpenAI(
	base_url="https://api-inference.huggingface.co/v1/",
	api_key="${tokenStr}"
)

messages = ${formattedMessages({ sep: ",\n\t", start: `[\n\t`, end: `\n]` })}

completion = client.chat.completions.create(
    model="${conversation.model.id}",
	messages=messages,
	${formattedConfig({ sep: ",\n\t", start: "", end: "", connector: "=" })}
)

print(completion.choices[0].message)`,
			});
		}

		return snippets;
	}

	function getHttpSnippets(conversation: Conversation, tokenStr: string) {
		if (tokenStr === "YOUR_HF_TOKEN") {
			tokenStr = "{YOUR_HF_TOKEN}";
		}
		const formattedMessages = ({ sep, start, end }: MessagesJoiner) =>
			start +
			getMessages()
				.map(({ role, content }) => {
					// escape single quotes since single quotes is used to define http post body inside curl requests
					content = content?.replace(/'/g, "'\\''");
					return `{ "role": "${role}", "content": "${content}" }`;
				})
				.join(sep) +
			end;

		const formattedConfig = ({ sep, start, end }: MessagesJoiner) =>
			start +
			Object.entries(conversation.config)
				.map(([key, val]) => `"${key}": ${val}`)
				.join(sep) +
			end;

		const snippets: Snippet[] = [];

		if (conversation.streaming) {
			snippets.push({
				label: "Streaming API",
				needsToken: true,
				code: `curl 'https://api-inference.huggingface.co/models/${conversation.model.id}/v1/chat/completions' \\
--header "Authorization: Bearer ${tokenStr}" \\
--header 'Content-Type: application/json' \\
--data '{
    "model": "${conversation.model.id}",
    "messages": ${formattedMessages({ sep: ",\n    ", start: `[\n    `, end: `\n]` })},
    ${formattedConfig({ sep: ",\n    ", start: "", end: "" })},
    "stream": true
}'`,
			});
		} else {
			// non-streaming
			snippets.push({
				label: "Non-Streaming API",
				needsToken: true,
				code: `curl 'https://api-inference.huggingface.co/models/${conversation.model.id}/v1/chat/completions' \\
--header "Authorization: Bearer ${tokenStr}" \\
--header 'Content-Type: application/json' \\
--data '{
    "model": "${conversation.model.id}",
    "messages": ${formattedMessages({ sep: ",\n    ", start: `[\n    `, end: `\n]` })},
    ${formattedConfig({ sep: ",\n    ", start: "", end: "" })}
}'`,
			});
		}

		return snippets;
	}

	onDestroy(() => {
		if (timeout) {
			clearTimeout(timeout);
		}
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

	{#if clientSnippetsByLang[selectedLanguage]?.length ?? 0 > 1}
		<div class="flex gap-x-2 px-2 pt-6">
			{#each clientSnippetsByLang[selectedLanguage] ?? [] as { name }, idx}
				<button
					class="rounded-md px-1.5 py-0.5 leading-tight {idx === selectedClientIdxByLang[selectedLanguage]
						? 'bg-black text-gray-100 dark:bg-gray-600 dark:text-white'
						: 'text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'}"
					on:click={() => (selectedClientIdxByLang[selectedLanguage] = idx)}>{name}</button
				>
			{/each}
		</div>
	{/if}

	{#each clientSnippetsByLang[selectedLanguage] ?? [] as { snippets }, idx}
		{#if idx === selectedClientIdxByLang[selectedLanguage]}
			{#each snippets as { label, code, language, needsToken }}
				<div class="flex items-center justify-between px-2 pt-6 pb-4">
					<h2 class="font-semibold">{label}</h2>
					<div class="flex items-center gap-x-4">
						{#if needsToken && $token.value}
							<label class="flex items-center gap-x-1.5 text-sm select-none">
								<input type="checkbox" bind:checked={showToken} />
								<p class="leading-none">With token</p>
							</label>
						{/if}
						<button
							class="flex items-center gap-x-2 rounded-md border bg-white px-1.5 py-0.5 text-sm shadow-xs transition dark:border-gray-800 dark:bg-gray-800"
							on:click={e => {
								const el = e.currentTarget;
								el.classList.add("text-green-500");
								navigator.clipboard.writeText(code);
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
						code,
						language ?? selectedLanguage
					)}</pre>
			{/each}
		{/if}
	{/each}
</div>
