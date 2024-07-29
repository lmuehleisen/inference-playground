interface GenerationKeySettings {
	default: number;
	step: number;
	min: number;
	max: number;
	label: string;
}

export const GENERATION_CONFIG_SETTINGS: Record<string, GenerationKeySettings> = {
	temperature: {
		default: 0.7,
		step: 0.01,
		min: 0,
		max: 2,
		label: "Temperature",
	},
	max_tokens: {
		default: 512,
		step: 1,
		min: 1,
		max: 8192, // changed dynamically based on model
		label: "Max Tokens",
	},
	top_p: {
		default: 0.7,
		step: 0.01,
		min: 0,
		max: 1,
		label: "Top-P",
	},
};

export type GenerationConfigKey = keyof typeof GENERATION_CONFIG_SETTINGS;

export const GENERATION_CONFIG_KEYS: GenerationConfigKey[] = ["temperature", "max_tokens", "top_p"];

export type GenerationConfig = Record<GenerationConfigKey, number>;

export const defaultGenerationConfig = GENERATION_CONFIG_KEYS.reduce((acc, key) => {
	acc[key] = GENERATION_CONFIG_SETTINGS[key].default;
	return acc;
}, {} as GenerationConfig);
