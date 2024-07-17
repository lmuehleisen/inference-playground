import type { ModelEntry } from '@huggingface/hub';
import type { ChatCompletionInputMessage } from '@huggingface/tasks';

type Model = string;

type GenerationConfig = {
	temperature: number;
	maxTokens: number;
	streaming: boolean;
	jsonMode: boolean;
};

type Conversation = {
	id: string;
	model: ModelEntryWithTokenizer;
	config: GenerationConfig;
	messages: ChatCompletionInputMessage[];
};

interface TokenizerConfig {
	chat_template?: string;
	model_max_length?: number;
}

export interface ModelEntryWithTokenizer extends ModelEntry {
	tokenizerConfig: TokenizerConfig;
}
