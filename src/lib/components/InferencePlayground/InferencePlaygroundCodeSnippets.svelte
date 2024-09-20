<script lang="ts">
	import type { Conversation } from "./types";

	import { onDestroy } from "svelte";
	import hljs from "highlight.js/lib/core";
	import javascript from "highlight.js/lib/languages/javascript";
	import python from "highlight.js/lib/languages/python";
	import http from "highlight.js/lib/languages/http";

	import IconCopyCode from "../Icons/IconCopyCode.svelte";
	import { isSystemPromptSupported } from "./inferencePlaygroundUtils";

	hljs.registerLanguage("javascript", javascript);
	hljs.registerLanguage("python", python);
	hljs.registerLanguage("http", http);

	export let conversation: Conversation;
	export let hfToken: string;

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

	interface MessagesJoiner {
		sep: string;
		start: string;
		end: string;
	}

	let selectedLanguage: Language = "javascript";
	let timeout: ReturnType<typeof setTimeout>;
	let showToken = false;

	$: tokenStr = getTokenStr(showToken);

	let snippetsByLanguage: Record<Language, Snippet[]>;
	$: snippetsByLanguage = {
		javascript: getJavascriptSnippets(conversation, tokenStr),
		python: getPythonSnippets(conversation, tokenStr),
		http: getHttpSnippets(conversation, tokenStr),
	};

	function getTokenStr(showToken: boolean) {
		if (hfToken && showToken) {
			return hfToken;
		}
		return "YOUR_HF_TOKEN";
	}

	function getMessages() {
		const placeholder = [{ role: "user", content: "Tell me a story" }];

		let messages = [...conversation.messages];
		if (messages.length === 1 && messages[0].role === "user" && !messages[0].content) {
			messages = placeholder;
		}

		const { model, systemMessage } = conversation;
		if (isSystemPromptSupported(model) && systemMessage.content?.length) {
			messages.unshift(systemMessage);
		}

		messages = messages.map(({ role, content }) => ({
			role,
			content: JSON.stringify(content).slice(1, -1),
		}));

		return messages;
	}

	function highlight(code: string, language: Language) {
		return hljs.highlight(code, { language }).value;
	}

	function getJavascriptSnippets(conversation: Conversation, tokenStr: string) {
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

const inference = new HfInference("${tokenStr}")

let out = "";

for await (const chunk of inference.chatCompletionStream({
  model: "${conversation.model.id}",
  messages: ${formattedMessages({ sep: ",\n\t", start: "[\n\t", end: "\n  ]" })},
  ${formattedConfig({ sep: ",\n  ", start: "", end: "" })}
})) {
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

const inference = new HfInference("${tokenStr}")

const out = await inference.chatCompletion({
	model: "${conversation.model.id}",
	messages: ${formattedMessages({ sep: ",\n\t\t", start: "[\n\t\t", end: "\n\t]" })},
	${formattedConfig({ sep: ",\n\t", start: "", end: "" })}
});

console.log(out.choices[0].message);`,
			});
		}

		return snippets;
	}

	function getPythonSnippets(conversation: Conversation, tokenStr: string) {
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

output = client.chat.completions.create(
    model="${conversation.model.id}", 
	messages=messages, 
	stream=True, 
	${formattedConfig({ sep: ",\n\t", start: "", end: "", connector: "=" })}
)

for chunk in output:
    print(chunk.choices[0].delta.content)`,
			});
		} else {
			// non-streaming
			snippets.push({
				label: "Non-Streaming API",
				needsToken: true,
				code: `from huggingface_hub import InferenceClient

model_id="${conversation.model.id}"
client = InferenceClient(api_key="${tokenStr}")

messages = ${formattedMessages({ sep: ",\n\t", start: `[\n\t`, end: `\n]` })}

output = client.chat.completions.create(
    model="${conversation.model.id}", 
	messages=messages, 
	${formattedConfig({ sep: ",\n\t", start: "", end: "", connector: "=" })}
)

print(output.choices[0].message)`,
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
		</ul>
	</div>

	{#each snippetsByLanguage[selectedLanguage] as { label, code, language, needsToken }}
		<div class="flex items-center justify-between px-2 pb-4 pt-6">
			<h2 class="font-semibold">{label}</h2>
			<div class="flex items-center gap-x-4">
				{#if needsToken && hfToken}
					<label class="flex select-none items-center gap-x-1.5 text-sm">
						<input type="checkbox" bind:checked={showToken} />
						<p class="leading-none">With token</p>
					</label>
				{/if}
				<button
					class="flex items-center gap-x-2 rounded-md border bg-white px-1.5 py-0.5 text-sm shadow-sm transition dark:border-gray-800 dark:bg-gray-800"
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
			class="overflow-x-auto rounded-lg border border-gray-200/80 bg-white px-4 py-6 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-800/50">{@html highlight(
				code,
				language ?? selectedLanguage
			)}</pre>
	{/each}
</div>
