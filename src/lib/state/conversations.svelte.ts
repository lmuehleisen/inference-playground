import {
	defaultGenerationConfig,
	type GenerationConfig,
} from "$lib/components/inference-playground/generation-config-settings.js";
import { addToast } from "$lib/components/toaster.svelte.js";
import { AbortManager } from "$lib/spells/abort-manager.svelte";
import { PipelineTag, type ConversationMessage, type GenerationStatistics, type Model } from "$lib/types.js";
import { handleNonStreamingResponse, handleStreamingResponse, estimateTokens } from "$lib/utils/business.svelte.js";
import { omit, snapshot } from "$lib/utils/object.svelte";
import { models } from "./models.svelte";
import { pricing } from "./pricing.svelte.js";
import { DEFAULT_PROJECT_ID, ProjectEntity, projects } from "./projects.svelte";
import { token } from "./token.svelte";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Svelte imports are broken in TS files
import { showQuotaModal } from "$lib/components/quota-modal.svelte";
import { idb } from "$lib/remult.js";
import { createInit } from "$lib/spells/create-init.svelte";
import { isString } from "$lib/utils/is.js";
import { poll } from "$lib/utils/poll.js";
import { Entity, Fields, repo, type MembersOnly } from "remult";
import { images } from "./images.svelte";

@Entity("conversation")
export class ConversationEntity {
	@Fields.autoIncrement()
	id!: number;

	@Fields.json()
	config: GenerationConfig = {};

	@Fields.json()
	extraParams?: Record<string, string>;

	@Fields.json()
	structuredOutput?: {
		enabled?: boolean;
		schema?: string;
	};

	@Fields.boolean()
	parseMarkdown = false;

	@Fields.json()
	messages?: ConversationMessage[];

	@Fields.boolean()
	streaming = false;

	@Fields.string()
	provider?: string;

	@Fields.string()
	projectId!: string;

	@Fields.string()
	modelId!: string;

	@Fields.createdAt()
	createdAt!: Date;
}

export type ConversationEntityMembers = MembersOnly<ConversationEntity>;

const conversationsRepo = repo(ConversationEntity, idb);

export const emptyModel: Model = {
	_id: "",
	inferenceProviderMapping: [],
	pipeline_tag: PipelineTag.TextGeneration,
	trendingScore: 0,
	tags: ["text-generation"],
	id: "",
	config: {
		architectures: [] as string[],
		model_type: "",
		tokenizer_config: {},
	},
};

function getDefaultConversation(projectId: string) {
	return {
		projectId,
		modelId: models.trending[0]?.id ?? models.remote[0]?.id ?? emptyModel.id,
		config: { ...defaultGenerationConfig },
		messages: [],
		streaming: true,
		parseMarkdown: false,
		createdAt: new Date(),
	} satisfies Partial<ConversationEntityMembers>;
}

export class ConversationClass {
	#data = $state.raw() as ConversationEntityMembers;
	readonly model = $derived(models.all.find(m => m.id === this.data.modelId) ?? emptyModel);

	abortManager = new AbortManager();
	generationStats = $state({ latency: 0, tokens: 0, cost: 0 }) as GenerationStatistics;
	generating = $state(false);

	constructor(data: ConversationEntityMembers) {
		this.#data = data;
	}

	get data() {
		return this.#data;
	}

	get isStructuredOutputAllowed() {
		return models.supportsStructuredOutput(this.model, this.data.provider);
	}

	get isStructuredOutputEnabled() {
		return this.isStructuredOutputAllowed && this.data.structuredOutput?.enabled;
	}

	get supportsImgUpload() {
		return this.model.pipeline_tag === PipelineTag.ImageTextToText;
	}

	update = async (data: Partial<ConversationEntityMembers>) => {
		if (this.data.id === -1) return;
		// if (this.data.id === undefined) return;
		const cloned = snapshot({ ...this.data, ...data });

		if (this.data.id === undefined) {
			const saved = await conversationsRepo.save(omit(cloned, "id"));
			this.#data = { ...cloned, id: saved.id };
		} else {
			await conversationsRepo.update(this.data.id, cloned);
			this.#data = cloned;
		}
	};

	addMessage = async (message: ConversationMessage) => {
		await this.update({
			...this.data,
			messages: [...(this.data.messages || []), snapshot(message)],
		});
	};

	updateMessage = async (args: { index: number; message: Partial<ConversationMessage> }) => {
		if (!this.data.messages) return;
		const prev = await poll(() => this.data.messages?.[args.index], { interval: 10, maxAttempts: 200 });

		if (!prev) return;

		await this.update({
			...this.data,
			messages: [
				...this.data.messages.slice(0, args.index),
				snapshot({ ...prev, ...args.message }),
				...this.data.messages.slice(args.index + 1),
			],
		});
	};

	checkAndClearBranchStatus = async (deletionIndex: number) => {
		const currentProject = projects.current;

		if (!currentProject?.branchedFromId || typeof currentProject?.branchedFromMessageIndex !== "number") return;

		// If we're deleting messages at or before the branch point, clear branch status
		if (deletionIndex <= currentProject.branchedFromMessageIndex) {
			await projects.clearBranchStatus(currentProject.id);
		}
	};

	deleteMessage = async (idx: number) => {
		if (!this.data.messages) return;
		const imgKeys = this.data.messages.flatMap(m => m.images).filter(isString);

		// Check if we need to clear branch status
		await this.checkAndClearBranchStatus(idx);

		await Promise.all([
			...imgKeys.map(k => images.delete(k)),
			this.update({
				...this.data,
				messages: this.data.messages.slice(0, idx),
			}),
		]);
	};

	deleteMessages = async (from: number) => {
		if (!this.data.messages) return;
		const sliced = this.data.messages.slice(0, from);
		const notSliced = this.data.messages.slice(from);

		// Check if we need to clear branch status
		await this.checkAndClearBranchStatus(from);

		const imgKeys = notSliced.flatMap(m => m.images).filter(isString);
		await Promise.all([
			...imgKeys.map(k => images.delete(k)),
			this.update({
				...this.data,
				messages: sliced,
			}),
		]);
	};

	genNextMessage = async () => {
		if (!token.value) {
			token.showModal = true;
			return;
		}

		this.generating = true;
		const startTime = performance.now();

		try {
			if (this.data.streaming) {
				let addedMessage = false;
				const streamingMessage = { role: "assistant", content: "" };
				const index = this.data.messages?.length || 0;

				await handleStreamingResponse(
					this,
					content => {
						if (!streamingMessage) return;
						streamingMessage.content = content;

						if (!addedMessage) {
							this.addMessage(streamingMessage);
							addedMessage = true;
						} else {
							this.updateMessage({ index, message: streamingMessage });
						}
					},
					this.abortManager.createController(),
				);
			} else {
				const { message: newMessage, completion_tokens: newTokensCount } = await handleNonStreamingResponse(this);
				this.addMessage(newMessage);
				this.generationStats.tokens += newTokensCount;
			}
		} catch (error) {
			if (error instanceof Error) {
				// const msg = error.message;
				// if (msg.toLowerCase().includes("monthly") || msg.toLowerCase().includes("pro")) {
				// 	showQuotaModal();
				// }

				if (error.message.includes("token seems invalid")) {
					token.reset();
				}

				if (error.name !== "AbortError") {
					addToast({ title: "Error", description: error.message, variant: "error" });
				}
			} else {
				addToast({ title: "Error", description: "An unknown error occurred", variant: "error" });
			}
		}

		const endTime = performance.now();
		this.generationStats.latency = Math.round(endTime - startTime);

		// Calculate cost if we have pricing data
		if (this.data.provider && this.data.provider !== "auto") {
			const inputTokens = estimateTokens(this);
			const outputTokens = this.generationStats.tokens;
			const costEstimate = pricing.estimateCost(this.model.id, this.data.provider, inputTokens, outputTokens);
			if (costEstimate) {
				this.generationStats.cost = costEstimate.total;
			}
		}

		this.generating = false;
	};

	stopGenerating = () => {
		this.abortManager.abortAll();
		this.generating = false;
	};
}

class Conversations {
	#conversations: Record<ProjectEntity["id"], ConversationClass[]> = $state.raw({});
	generationStats = $derived(this.active.map(c => c.generationStats));
	loaded = $state(false);

	#active = $derived.by(() => this.for(projects.activeId));

	init = createInit(() => {
		const searchParams = new URLSearchParams(window.location.search);
		const searchProvider = searchParams.get("provider") ?? "";
		const searchModelId = searchParams.get("modelId") ?? "";

		const searchModel = models.remote.find(m => m.id === searchModelId);
		if (!searchModel) return;

		conversationsRepo
			.upsert({
				where: { projectId: DEFAULT_PROJECT_ID },
				set: {
					modelId: searchModelId,
					provider: searchProvider,
				},
			})
			.then(res => {
				this.#conversations = { ...this.#conversations, [DEFAULT_PROJECT_ID]: [new ConversationClass(res)] };
			});
	});

	get conversations() {
		return this.#conversations;
	}

	get generating() {
		return this.#active.some(c => c.generating);
	}

	get active() {
		return this.#active;
	}

	create = async (
		args: { projectId: ProjectEntity["id"]; modelId?: Model["id"] } & Partial<ConversationEntityMembers>,
	) => {
		const conv = snapshot({
			...getDefaultConversation(args.projectId),
			...args,
		});
		if (args.modelId) conv.modelId = args.modelId;

		const { id } = await conversationsRepo.save(conv);
		const prev = this.#conversations[args.projectId] ?? [];
		this.#conversations = {
			...this.#conversations,
			[args.projectId]: [...prev, new ConversationClass({ ...conv, id })],
		};

		return id;
	};

	for = (projectId: ProjectEntity["id"]): ConversationClass[] => {
		// Async load from db
		if (!this.#conversations[projectId]?.length) {
			conversationsRepo.find({ where: { projectId } }).then(c => {
				if (!c.length) {
					const dc = conversationsRepo.create(getDefaultConversation(projectId));
					c.push(dc);
				}
				this.#conversations = { ...this.#conversations, [projectId]: c.map(c => new ConversationClass(c)) };
			});
		}

		let res = this.#conversations[projectId];
		if (res?.length === 0 || !res) {
			// We set id to -1 because it is temporary, there should always be a conversation.
			const dc = { ...getDefaultConversation(projectId), id: -1 };
			res = [new ConversationClass(dc)];
		}

		return res.slice(0, 2).toSorted((a, b) => {
			return a.data.createdAt.getTime() - b.data.createdAt.getTime();
		});
	};

	delete = async ({ id, projectId }: ConversationEntityMembers) => {
		if (!id) return;

		await conversationsRepo.delete(id);

		const prev = this.#conversations[projectId] ?? [];
		this.#conversations = { ...this.#conversations, [projectId]: prev.filter(c => c.data.id != id) };
	};

	deleteAllFrom = async (projectId: string) => {
		this.for(projectId).forEach(c => this.delete(c.data));
	};

	reset = async () => {
		await Promise.allSettled(this.active.map(c => this.delete(c.data)));
		this.create(getDefaultConversation(projects.activeId));
	};

	migrate = async (from: ProjectEntity["id"], to: ProjectEntity["id"]) => {
		const fromArr = this.#conversations[from] ?? [];
		await Promise.allSettled(fromArr.map(c => c.update({ projectId: to })));
		this.#conversations = {
			...this.#conversations,
			[to]: [...fromArr],
			[from]: [],
		};
	};

	duplicate = async (from: ProjectEntity["id"], to: ProjectEntity["id"]) => {
		const fromArr = this.#conversations[from] ?? [];
		await Promise.allSettled(
			fromArr.map(async c => {
				conversations.create({ ...c.data, projectId: to });
			}),
		);
	};

	duplicateUpToMessage = async (from: ProjectEntity["id"], to: ProjectEntity["id"], messageIndex: number) => {
		const fromArr = this.#conversations[from] ?? [];

		// Clear any existing conversations for the target project first
		this.#conversations[to] = [];

		// Delete any existing conversations in the database for this project
		const existingConversations = await conversationsRepo.find({ where: { projectId: to } });
		await Promise.all(existingConversations.map(c => conversationsRepo.delete(c.id)));

		const newConversations: ConversationClass[] = [];

		for (const c of fromArr) {
			// Copy only messages up to the specified index with deep clone
			const truncatedMessages =
				c.data.messages?.slice(0, messageIndex + 1).map(msg => ({
					...msg,
					images: msg.images ? [...msg.images] : undefined,
				})) || [];

			const conversationData = {
				...snapshot(c.data),
				projectId: to,
				messages: truncatedMessages,
				id: undefined, // Let the database generate a new ID
			};

			// Use conversationsRepo directly to avoid default conversation merging
			const saved = await conversationsRepo.save(conversationData);
			newConversations.push(new ConversationClass(saved));
		}

		// Update the in-memory cache
		this.#conversations[to] = newConversations;
	};

	genNextMessages = async (conv: "left" | "right" | "both" | ConversationClass = "both") => {
		if (!token.value) {
			token.showModal = true;
			return;
		}

		const conversations = (() => {
			if (typeof conv === "string") {
				return this.active.filter((_, idx) => {
					return conv === "both" || (conv === "left" ? idx === 0 : idx === 1);
				});
			}
			return [conv];
		})();

		for (let idx = 0; idx < conversations.length; idx++) {
			const conversation = conversations[idx];
			if (!conversation || conversation.data.messages?.at(-1)?.role !== "assistant") continue;

			let prefix = "";
			if (this.active.length === 2) {
				prefix = `Error on ${idx === 0 ? "left" : "right"} conversation. `;
			}
			return addToast({
				title: "Failed to run inference",
				description: `${prefix}Messages must alternate between user/assistant roles.`,
				variant: "error",
			});
		}

		(document.activeElement as HTMLElement).blur();

		try {
			const promises = conversations.map(c => c.genNextMessage());
			await Promise.all(promises);
		} catch (error) {
			if (error instanceof Error) {
				const msg = error.message;
				if (msg.toLowerCase().includes("montly") || msg.toLowerCase().includes("pro")) {
					showQuotaModal();
				}

				if (error.message.includes("token seems invalid")) {
					token.reset();
				}

				if (error.name !== "AbortError") {
					addToast({ title: "Error", description: error.message, variant: "error" });
				}
			} else {
				addToast({ title: "Error", description: "An unknown error occurred", variant: "error" });
			}
		}
	};

	stopGenerating = () => {
		this.active.forEach(c => c.abortManager.abortAll());
	};

	genOrStop = (c?: Parameters<typeof this.genNextMessages>[0]) => {
		if (this.generating) {
			this.stopGenerating();
		} else {
			this.genNextMessages(c);
		}
	};
}

export const conversations = new Conversations();
