import type { GenerationConfig } from "$lib/components/InferencePlayground/generationConfigSettings";
import type { ModelEntry } from "@huggingface/hub";
import type { ChatCompletionInputMessage } from "@huggingface/tasks";

export type Conversation = {
	model: ModelEntryWithTokenizer;
	config: GenerationConfig;
	messages: ChatCompletionInputMessage[];
	systemMessage: ChatCompletionInputMessage;
	streaming: boolean;
};

export type Session = {
	conversations: [Conversation] | [Conversation, Conversation];
};

interface TokenizerConfig {
	chat_template?: string;
	model_max_length?: number;
}

export interface ModelEntryWithTokenizer extends ModelEntry {
	tokenizerConfig: TokenizerConfig;
}
