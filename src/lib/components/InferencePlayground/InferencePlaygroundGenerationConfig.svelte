<script lang="ts">
	import type { Conversation } from "$lib/components/InferencePlayground/types";

	import { GENERATION_CONFIG_KEYS, GENERATION_CONFIG_SETTINGS } from "./generationConfigSettings";

	export let conversation: Conversation;
	export let classNames = "";

	const customMaxTokens: { [key: string]: number } = {
		"01-ai/Yi-1.5-34B-Chat": 2048,
		"HuggingFaceM4/idefics-9b-instruct": 2048,
		"deepseek-ai/DeepSeek-Coder-V2-Instruct": 16384,
		"bigcode/starcoder": 8192,
		"bigcode/starcoderplus": 8192,
		"HuggingFaceH4/starcoderbase-finetuned-oasst1": 8192,
		"google/gemma-7b": 8192,
		"google/gemma-1.1-7b-it": 8192,
		"google/gemma-2b": 8192,
		"google/gemma-1.1-2b-it": 8192,
		"google/gemma-2-27b-it": 8192,
		"google/gemma-2-9b-it": 4096,
		"google/gemma-2-2b-it": 8192,
		"tiiuae/falcon-7b": 8192,
		"tiiuae/falcon-7b-instruct": 8192,
		"timdettmers/guanaco-33b-merged": 2048,
		"mistralai/Mixtral-8x7B-Instruct-v0.1": 32768,
		"Qwen/Qwen2.5-72B-Instruct": 32768,
		"Qwen/Qwen2.5-Coder-32B-Instruct": 32768,
		"meta-llama/Meta-Llama-3-70B-Instruct": 8192,
		"CohereForAI/c4ai-command-r-plus-08-2024": 32768,
		"NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO": 32768,
		"meta-llama/Llama-2-70b-chat-hf": 8192,
		"HuggingFaceH4/zephyr-7b-alpha": 17432,
		"HuggingFaceH4/zephyr-7b-beta": 32768,
		"mistralai/Mistral-7B-Instruct-v0.1": 32768,
		"mistralai/Mistral-7B-Instruct-v0.2": 32768,
		"mistralai/Mistral-7B-Instruct-v0.3": 32768,
		"mistralai/Mistral-Nemo-Instruct-2407": 32768,
		"meta-llama/Meta-Llama-3-8B-Instruct": 8192,
		"mistralai/Mistral-7B-v0.1": 32768,
		"bigcode/starcoder2-3b": 16384,
		"bigcode/starcoder2-15b": 16384,
		"HuggingFaceH4/starchat2-15b-v0.1": 16384,
		"codellama/CodeLlama-7b-hf": 8192,
		"codellama/CodeLlama-13b-hf": 8192,
		"codellama/CodeLlama-34b-Instruct-hf": 8192,
		"meta-llama/Llama-2-7b-chat-hf": 8192,
		"meta-llama/Llama-2-13b-chat-hf": 8192,
		"OpenAssistant/oasst-sft-6-llama-30b": 2048,
		"TheBloke/vicuna-7B-v1.5-GPTQ": 2048,
		"HuggingFaceH4/starchat-beta": 8192,
		"bigcode/octocoder": 8192,
		"vwxyzjn/starcoderbase-triviaqa": 8192,
		"lvwerra/starcoderbase-gsm8k": 8192,
	} as const;

	$: modelMaxLength = customMaxTokens[conversation.model.id] ?? conversation.model.tokenizerConfig.model_max_length;
	$: maxTokens = Math.min(modelMaxLength ?? GENERATION_CONFIG_SETTINGS["max_tokens"].max, 64_000);
</script>

<div class="flex flex-col gap-y-7 {classNames}">
	{#each GENERATION_CONFIG_KEYS as key}
		{@const { label, min, step } = GENERATION_CONFIG_SETTINGS[key]}
		{@const max = key === "max_tokens" ? maxTokens : GENERATION_CONFIG_SETTINGS[key].max}
		<div>
			<div class="flex items-center justify-between">
				<label for="temperature-range" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
					>{label}</label
				>
				<input
					type="number"
					class="w-18 rounded border bg-transparent px-1 py-0.5 text-right text-sm dark:border-gray-700"
					{min}
					{max}
					{step}
					bind:value={conversation.config[key]}
				/>
			</div>
			<input
				id="temperature-range"
				type="range"
				{min}
				{max}
				{step}
				bind:value={conversation.config[key]}
				class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-black dark:bg-gray-700 dark:accent-blue-500"
			/>
		</div>
	{/each}

	<div class="mt-2">
		<label class="flex cursor-pointer items-center justify-between">
			<input type="checkbox" bind:checked={conversation.streaming} class="peer sr-only" />
			<span class="text-sm font-medium text-gray-900 dark:text-gray-300">Streaming</span>
			<div
				class="peer relative h-5 w-9 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-black peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:bg-blue-600"
			></div>
		</label>
	</div>
</div>
