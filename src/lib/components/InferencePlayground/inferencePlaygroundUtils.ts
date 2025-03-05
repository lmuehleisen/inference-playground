import { type ChatCompletionOutputMessage } from "@huggingface/tasks";
import type { Conversation, ModelEntryWithTokenizer } from "./types";

import { HfInference } from "@huggingface/inference";

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
		...conversation.config,
	});

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

export const FEATURED_MODELS_IDS = [
	"meta-llama/Llama-3.3-70B-Instruct",
	"meta-llama/Llama-3.1-8B-Instruct",
	"meta-llama/Llama-3.2-3B-Instruct",
	"Qwen/Qwen2.5-72B-Instruct",
	"Qwen/QwQ-32B-Preview",
];
