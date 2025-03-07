import { type ChatCompletionOutputMessage } from "@huggingface/tasks";
import type { InferenceSnippet, ModelDataMinimal } from "@huggingface/tasks";
import type { Conversation, ModelWithTokenizer } from "$lib/types";

import { HfInference, snippets, type InferenceProvider } from "@huggingface/inference";
import { keys } from "$lib/utils/object";

export async function handleStreamingResponse(
	hf: HfInference,
	conversation: Conversation,
	onChunk: (content: string) => void,
	abortController: AbortController
): Promise<void> {
	const { model, systemMessage } = conversation;
	const messages = [
		...(isSystemPromptSupported(model) && systemMessage.content?.length ? [systemMessage] : []),
		...conversation.messages,
	];
	let out = "";
	for await (const chunk of hf.chatCompletionStream(
		{
			model: model.id,
			messages,
			provider: conversation.provider,
			...conversation.config,
		},
		{ signal: abortController.signal }
	)) {
		if (chunk.choices && chunk.choices.length > 0 && chunk.choices[0]?.delta?.content) {
			out += chunk.choices[0].delta.content;
			onChunk(out);
		}
	}
}

export async function handleNonStreamingResponse(
	hf: HfInference,
	conversation: Conversation
): Promise<{ message: ChatCompletionOutputMessage; completion_tokens: number }> {
	const { model, systemMessage } = conversation;
	const messages = [
		...(isSystemPromptSupported(model) && systemMessage.content?.length ? [systemMessage] : []),
		...conversation.messages,
	];

	const response = await hf.chatCompletion({
		model: model.id,
		messages,
		provider: conversation.provider,
		...conversation.config,
	});

	if (response.choices && response.choices.length > 0) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const { message } = response.choices[0]!;
		const { completion_tokens } = response.usage;
		return { message, completion_tokens };
	}
	throw new Error("No response from the model");
}

export function isSystemPromptSupported(model: ModelWithTokenizer) {
	return model?.tokenizerConfig?.chat_template?.includes("system");
}

export const FEATURED_MODELS_IDS = [
	"meta-llama/Llama-3.3-70B-Instruct",
	"meta-llama/Llama-3.1-8B-Instruct",
	"meta-llama/Llama-3.2-3B-Instruct",
	"Qwen/Qwen2.5-72B-Instruct",
	"Qwen/QwQ-32B-Preview",
];

export const defaultSystemMessage: { [key: string]: string } = {
	"Qwen/QwQ-32B-Preview":
		"You are a helpful and harmless assistant. You are Qwen developed by Alibaba. You should think step-by-step.",
} as const;

export const customMaxTokens: { [key: string]: number } = {
	"01-ai/Yi-1.5-34B-Chat": 2048,
	"HuggingFaceM4/idefics-9b-instruct": 2048,
	"deepseek-ai/DeepSeek-Coder-V2-Instruct": 16384,
	"bigcode/starcoder": 8192,
	"bigcode/starcoderplus": 8192,
	"HuggingFaceH4/starcoderbase-finetuned-oasst1": 8192,
	"google/gemma-7b": 8192,
	"google/gemma-1.1-7b-it": 8192,
	"google/gemma-2b": 8192,
	"google/gemma-1.1-2b-it": 8192,
	"google/gemma-2-27b-it": 8192,
	"google/gemma-2-9b-it": 4096,
	"google/gemma-2-2b-it": 8192,
	"tiiuae/falcon-7b": 8192,
	"tiiuae/falcon-7b-instruct": 8192,
	"timdettmers/guanaco-33b-merged": 2048,
	"mistralai/Mixtral-8x7B-Instruct-v0.1": 32768,
	"Qwen/Qwen2.5-72B-Instruct": 32768,
	"Qwen/Qwen2.5-Coder-32B-Instruct": 32768,
	"meta-llama/Meta-Llama-3-70B-Instruct": 8192,
	"CohereForAI/c4ai-command-r-plus-08-2024": 32768,
	"NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO": 32768,
	"meta-llama/Llama-2-70b-chat-hf": 8192,
	"HuggingFaceH4/zephyr-7b-alpha": 17432,
	"HuggingFaceH4/zephyr-7b-beta": 32768,
	"mistralai/Mistral-7B-Instruct-v0.1": 32768,
	"mistralai/Mistral-7B-Instruct-v0.2": 32768,
	"mistralai/Mistral-7B-Instruct-v0.3": 32768,
	"mistralai/Mistral-Nemo-Instruct-2407": 32768,
	"meta-llama/Meta-Llama-3-8B-Instruct": 8192,
	"mistralai/Mistral-7B-v0.1": 32768,
	"bigcode/starcoder2-3b": 16384,
	"bigcode/starcoder2-15b": 16384,
	"HuggingFaceH4/starchat2-15b-v0.1": 16384,
	"codellama/CodeLlama-7b-hf": 8192,
	"codellama/CodeLlama-13b-hf": 8192,
	"codellama/CodeLlama-34b-Instruct-hf": 8192,
	"meta-llama/Llama-2-7b-chat-hf": 8192,
	"meta-llama/Llama-2-13b-chat-hf": 8192,
	"OpenAssistant/oasst-sft-6-llama-30b": 2048,
	"TheBloke/vicuna-7B-v1.5-GPTQ": 2048,
	"HuggingFaceH4/starchat-beta": 8192,
	"bigcode/octocoder": 8192,
	"vwxyzjn/starcoderbase-triviaqa": 8192,
	"lvwerra/starcoderbase-gsm8k": 8192,
	"NousResearch/Hermes-3-Llama-3.1-8B": 16384,
	"microsoft/Phi-3.5-mini-instruct": 32768,
	"meta-llama/Llama-3.1-70B-Instruct": 32768,
	"meta-llama/Llama-3.1-8B-Instruct": 8192,
} as const;

// Order of the elements in InferenceModal.svelte is determined by this const
export const inferenceSnippetLanguages = ["python", "js", "curl"] as const;

export type InferenceSnippetLanguage = (typeof inferenceSnippetLanguages)[number];

const GET_SNIPPET_FN = {
	curl: snippets.curl.getCurlInferenceSnippet,
	js: snippets.js.getJsInferenceSnippet,
	python: snippets.python.getPythonInferenceSnippet,
} as const;

export type GetInferenceSnippetReturn = (InferenceSnippet & { language: InferenceSnippetLanguage })[];

export function getInferenceSnippet(
	model: ModelWithTokenizer,
	provider: InferenceProvider,
	language: InferenceSnippetLanguage,
	accessToken: string,
	opts?: Record<string, unknown>
): GetInferenceSnippetReturn {
	const providerId = model.inferenceProviderMapping.find(p => p.provider === provider)?.providerId;
	const snippetsByClient = GET_SNIPPET_FN[language](
		{ ...model, inference: "" },
		accessToken,
		provider,
		providerId,
		opts
	);
	return snippetsByClient.map(snippetByClient => ({ ...snippetByClient, language }));
}

/**
 * - If language is defined, the function checks if in an inference snippet is available for that specific language
 */
export function hasInferenceSnippet(
	model: ModelWithTokenizer,
	provider: InferenceProvider,
	language: InferenceSnippetLanguage
): boolean {
	return getInferenceSnippet(model, provider, language, "").length > 0;
}
