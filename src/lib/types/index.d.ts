type Message = {
	role: string;
	content: string;
};

type Model = {
	model: string;
	temperature: number;
	maxTokens: number;
	streaming: boolean;
	jsonMode: boolean;
};

type Conversation = {
	model: Model;
	messages: Message[];
};
