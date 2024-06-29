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
	id: string;
	name: string;
	model: Model;
	messages: Message[];
};

type ConversationList = {
	conversations: Conversation[];
	activeConversationId: string | null;
};
