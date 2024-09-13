import { type ChatCompletionInputMessage } from "@huggingface/tasks";
import type { Conversation, ModelEntryWithTokenizer } from "./types";

import { HfInference } from "@huggingface/inference";

export function createHfInference(token: string): HfInference {
	return new HfInference(token);
}

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
			temperature: conversation.config.temperature,
			max_tokens: conversation.config.max_tokens,
		},
		{ signal: abortController.signal, use_cache: false }
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
): Promise<{ message: ChatCompletionInputMessage; completion_tokens: number }> {
	const { model, systemMessage } = conversation;
	const messages = [
		...(isSystemPromptSupported(model) && systemMessage.content?.length ? [systemMessage] : []),
		...conversation.messages,
	];

	const response = await hf.chatCompletion(
		{
			model: model.id,
			messages,
			temperature: conversation.config.temperature,
			max_tokens: conversation.config.max_tokens,
		},
		{ use_cache: false }
	);

	if (response.choices && response.choices.length > 0) {
		const { message } = response.choices[0];
		const { completion_tokens } = response.usage;
		return { message, completion_tokens };
	}
	throw new Error("No response from the model");
}

export function isSystemPromptSupported(model: ModelEntryWithTokenizer) {
	return model.tokenizerConfig?.chat_template?.includes("system");
}

export const FEATUED_MODELS_IDS = [
	"meta-llama/Meta-Llama-3.1-70B-Instruct",
	"meta-llama/Meta-Llama-3.1-8B-Instruct",
	"google/gemma-2-9b-it",
	"mistralai/Mistral-7B-Instruct-v0.3",
	"mistralai/Mistral-Nemo-Instruct-2407",
];
