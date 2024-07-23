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
	}

	interface MessagesJoiner {
		sep: string;
		start: string;
		end: string;
	}

	$: snippetsByLanguage = {
		javascript: getJavascriptSnippets(conversation),
		python: getPythonSnippets(conversation),
		http: getHttpSnippets(conversation),
	};

	let selectedLanguage: Language = "javascript";
	let timeout: ReturnType<typeof setTimeout>;

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

		return messages;
	}

	function highlight(code: string, language: Language) {
		return hljs.highlight(code, { language }).value;
	}

	function getJavascriptSnippets(conversation: Conversation) {
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
				code: `import { HfInference } from "@huggingface/inference"

const inference = new HfInference("your HF token")

let out = "";

for await (const chunk of inference.chatCompletionStream({
  model: "${conversation.model.id}",
  messages: ${formattedMessages({ sep: ",\n    ", start: "[\n    ", end: "\n  ]" })},
  ${formattedConfig({ sep: ",\n  ", start: "", end: "" })},
  seed: 0,
})) {
  if (chunk.choices && chunk.choices.length > 0) {
    const newContent = chunk.choices[0].delta.content;
    out += newContent;
	console.clear();
	console.log(out);
  }  
}`,
			});
		} else {
			// non-streaming
			snippets.push({
				label: "Non-Streaming API",
				code: `import { HfInference } from '@huggingface/inference'

const inference = new HfInference("your access token")

const out = await inference.chatCompletion({
    model: "${conversation.model.id}",
    messages: ${formattedMessages({ sep: ",\n        ", start: "[\n        ", end: "\n    ]" })},
	${formattedConfig({ sep: ",\n    ", start: "", end: "" })},
    seed: 0,
});

console.log(out.choices[0].message);`,
			});
		}

		return snippets;
	}

	function getPythonSnippets(conversation: Conversation) {
		const formattedMessages = ({ sep, start, end }: MessagesJoiner) =>
			start +
			getMessages()
				.map(({ role, content }) => `{ "role": "${role}", "content": "${content}" }`)
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
			label: "Install huggingface_hub",
			language: "http",
			code: `pip install huggingface_hub`,
		});
		if (conversation.streaming) {
			snippets.push({
				label: "Streaming API",
				code: `from huggingface_hub import InferenceClient

model_id="${conversation.model.id}"
hf_token = "your HF token"
inference_client = InferenceClient(model_id, token=hf_token)

output = ""

messages = ${formattedMessages({ sep: ",\n    ", start: `[\n    `, end: `\n]` })}

for token in client.chat_completion(messages, stream=True, ${formattedConfig({ sep: ", ", start: "", end: "" })}):
    new_content = token.choices[0].delta.content
    print(new_content, end="")
    output += new_content`,
			});
		} else {
			// non-streaming
			snippets.push({
				label: "Non-Streaming API",
				code: `from huggingface_hub import InferenceClient

model_id="${conversation.model.id}"
hf_token = "your HF token"
inference_client = InferenceClient(model_id, token=hf_token)

messages = ${formattedMessages({ sep: ",\n    ", start: `[\n    `, end: `\n]` })}

output = inference_client.chat_completion(messages, ${formattedConfig({ sep: ", ", start: "", end: "" })})

print(output.choices[0].message)`,
			});
		}

		return snippets;
	}

	function getHttpSnippets(conversation: Conversation) {
		const formattedMessages = ({ sep, start, end }: MessagesJoiner) =>
			start +
			getMessages()
				.map(({ role, content }) => `{ "role": "${role}", "content": "${content}" }`)
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
				code: `curl 'https://api-inference.huggingface.co/models/${conversation.model.id}/v1/chat/completions' \\
--header "Authorization: Bearer {YOUR_HF_TOKEN}" \\
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
				code: `curl 'https://api-inference.huggingface.co/models/${conversation.model.id}/v1/chat/completions' \\
--header "Authorization: Bearer {YOUR_HF_TOKEN}" \\
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

	{#each snippetsByLanguage[selectedLanguage] as { label, code, language }}
		<div class="flex items-center justify-between px-4 pb-4 pt-6">
			<h2 class="font-semibold">{label}</h2>
			<button
				class="flex items-center gap-x-1.5 rounded-md bg-gray-200 px-1.5 py-0.5 text-sm transition dark:bg-gray-950"
				on:click={e => {
					const el = e.currentTarget;
					el.classList.add("text-green-500");
					navigator.clipboard.writeText(code);
					if (timeout) {
						clearTimeout(timeout);
					}
					timeout = setTimeout(() => {
						el.classList.remove("text-green-500");
					}, 1000);
				}}
			>
				<IconCopyCode /> Copy code
			</button>
		</div>
		<pre
			class="overflow-x-auto rounded-lg border border-gray-200/80 bg-white px-4 py-6 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-800/50">{@html highlight(
				code,
				language ?? selectedLanguage
			)}</pre>
	{/each}
</div>
