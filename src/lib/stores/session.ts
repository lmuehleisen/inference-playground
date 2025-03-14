import { defaultGenerationConfig } from "$lib/components/InferencePlayground/generationConfigSettings";
import { models } from "$lib/stores/models";
import {
	PipelineTag,
	type Conversation,
	type ConversationMessage,
	type DefaultProject,
	type ModelWithTokenizer,
	type Project,
	type Session,
} from "$lib/types";
import { safeParse } from "$lib/utils/json";
import { getTrending } from "$lib/utils/model";
import { get, writable } from "svelte/store";
import typia from "typia";

const LOCAL_STORAGE_KEY = "hf_inference_playground_session";

const startMessageUser: ConversationMessage = { role: "user", content: "" };
const systemMessage: ConversationMessage = {
	role: "system",
	content: "",
};

const emptyModel: ModelWithTokenizer = {
	_id: "",
	inferenceProviderMapping: [],
	pipeline_tag: PipelineTag.TextGeneration,
	trendingScore: 0,
	tags: ["text-generation"],
	id: "",
	tokenizerConfig: {},
	config: {
		architectures: [] as string[],
		model_type: "",
		tokenizer_config: {},
	},
};

function getDefaults() {
	const $models = get(models);
	const featured = getTrending($models);
	const defaultModel = featured[0] ?? $models[0] ?? emptyModel;

	const defaultConversation: Conversation = {
		model: defaultModel,
		config: { ...defaultGenerationConfig },
		messages: [{ ...startMessageUser }],
		systemMessage,
		streaming: true,
	};

	const defaultProject: DefaultProject = {
		name: "Default",
		id: "default",
		conversations: [defaultConversation],
	};

	return { defaultProject, defaultConversation };
}

function createSessionStore() {
	const store = writable<Session>(undefined, set => {
		const { defaultConversation, defaultProject } = getDefaults();

		// Get saved session from localStorage if available
		let savedSession: Session = {
			projects: [defaultProject],
			activeProjectId: defaultProject.id,
		};

		const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
		if (savedData) {
			const parsed = safeParse(savedData);
			const res = typia.validate<Session>(parsed);
			if (res.success) {
				savedSession = parsed;
			} else {
				localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedSession));
			}
		}

		// Merge query params with savedSession's default project
		// Query params models and providers take precedence over savedSession's.
		// In any case, we try to merge the two, and the amount of conversations
		// is the maximum between the two.
		const dp = savedSession.projects.find(p => p.id === "default");
		if (typia.is<DefaultProject>(dp)) {
			const $models = get(models);
			// Parse URL query parameters
			const searchParams = new URLSearchParams(window.location.search);
			const searchProviders = searchParams.getAll("provider");
			const searchModelIds = searchParams.getAll("modelId");
			const modelsFromSearch = searchModelIds.map(id => $models.find(model => model.id === id)).filter(Boolean);
			if (modelsFromSearch.length > 0) savedSession.activeProjectId = "default";

			const max = Math.max(dp.conversations.length, modelsFromSearch.length, searchProviders.length);
			for (let i = 0; i < max; i++) {
				const conversation = dp.conversations[i] ?? defaultConversation;
				dp.conversations[i] = {
					...conversation,
					model: modelsFromSearch[i] ?? conversation.model,
					provider: searchProviders[i] ?? conversation.provider,
				};
			}
		}

		set(savedSession);
	});

	// Override update method to sync with localStorage and URL params
	const update: typeof store.update = cb => {
		store.update($s => {
			const s = cb($s);

			try {
				localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(s));
			} catch (e) {
				console.error("Failed to save session to localStorage:", e);
			}

			return s;
		});
	};

	const set: typeof store.set = (...args) => {
		update(_ => args[0]);
	};

	// Add a method to clear localStorage
	function clearSavedSession() {
		localStorage.removeItem(LOCAL_STORAGE_KEY);
	}

	/**
	 * Saves a new project with the data inside the default project
	 */
	function saveProject(name: string) {
		update(s => {
			const defaultProject = s.projects.find(p => p.id === "default");
			if (!defaultProject) return s;

			const project: Project = {
				...defaultProject,
				name,
				id: crypto.randomUUID(),
			};

			defaultProject.conversations = [getDefaults().defaultConversation];

			return { ...s, projects: [...s.projects, project], activeProjectId: project.id };
		});
	}

	function deleteProject(id: string) {
		// Can't delete default project!
		if (id === "default") return;

		update(s => {
			const projects = s.projects.filter(p => p.id !== id);
			if (projects.length === 0) {
				const { defaultProject } = getDefaults();
				const newSession = { ...s, projects: [defaultProject], activeProjectId: defaultProject.id };
				return typia.is<Session>(newSession) ? newSession : s;
			}

			const currProject = projects.find(p => p.id === s.activeProjectId);
			const newSession = { ...s, projects, activeProjectId: currProject?.id ?? projects[0]?.id };
			return typia.is<Session>(newSession) ? newSession : s;
		});
	}

	function updateProject(id: string, data: Partial<Project>) {
		update(s => {
			const projects = s.projects.map(p => (p.id === id ? { ...p, ...data } : p));
			const newSession = { ...s, projects };
			return typia.is<Session>(newSession) ? newSession : s;
		});
	}

	return { ...store, set, update, clearSavedSession, deleteProject, saveProject, updateProject };
}

export const session = createSessionStore();

export function getActiveProject(s: Session) {
	return s.projects.find(p => p.id === s.activeProjectId) ?? s.projects[0];
}

function createProjectStore() {
	const store = writable<Project>(undefined, set => {
		return session.subscribe(s => {
			set(getActiveProject(s));
		});
	});

	const update: (typeof store)["update"] = cb => {
		session.update(s => {
			const project = getActiveProject(s);
			const newProject = cb(project);
			const projects = s.projects.map(p => (p.id === project.id ? newProject : p));
			const newSession = { ...s, projects };
			return typia.is<Session>(newSession) ? newSession : s;
		});
	};

	const set: typeof store.set = (...args) => {
		update(_ => args[0]);
	};

	return { ...store, update, set };
}

export const project = createProjectStore();
