import type { ModelEntry } from "@huggingface/hub";

type Message = {
	role: string;
	content: string;
};

type Model = string;

type ModelConfig = {
	temperature: number;
	maxTokens: number;
	streaming: boolean;
	jsonMode: boolean;
};

type Conversation = {
	id: string;
	model: ModelEntry;
	config: ModelConfig;
	messages: Message[];
};
