import type { GenerationConfig } from "$lib/components/InferencePlayground/generationConfigSettings";
import type { Provider } from "$lib/fetchers/providers";
import type { ModelEntry } from "@huggingface/hub";
import type { ChatCompletionInputMessage } from "@huggingface/tasks";

export type ConversationMessage = Omit<ChatCompletionInputMessage, "content"> & { content?: string };

export type Conversation = {
	model: ModelEntryWithTokenizer;
	config: GenerationConfig;
	messages: ConversationMessage[];
	systemMessage: ConversationMessage;
	streaming: boolean;
	provider?: string;
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
