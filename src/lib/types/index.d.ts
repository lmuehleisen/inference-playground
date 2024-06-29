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
	model: Model;
	config: ModelConfig;
	messages: Message[];
};
