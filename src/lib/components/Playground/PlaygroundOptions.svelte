<script lang="ts">
	export let compatibleModels: string[] = [];
	export let currentModel = compatibleModels[0];
	export let temperature = 0.5;
	export let maxTokens = 2048;
	export let streaming = true;
</script>

<div>
	<form class="mx-auto max-w-sm">
		<label for="countries" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
			>Model</label
		>
		<select
			bind:value={currentModel}
			class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
		>
			{#each compatibleModels as model}
				<option value={model}>{model}</option>
			{/each}
		</select>
	</form>
</div>
<div>
	<div class="flex items-center justify-between">
		<label
			for="temperature-range"
			class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">Temperature</label
		>
		<input
			type="number"
			class="w-16 rounded border bg-transparent px-1 py-0.5 text-right text-sm dark:border-gray-700"
			bind:value={temperature}
			min="0"
			max="1"
			step="0.1"
		/>
	</div>
	<input
		id="temperature-range"
		type="range"
		bind:value={temperature}
		min="0"
		max="1"
		step="0.1"
		class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-black dark:bg-gray-700 dark:accent-blue-500"
	/>
</div>
<div>
	<div class="flex items-center justify-between">
		<label
			for="max-tokens-range"
			class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">Max tokens</label
		>
		<input
			type="number"
			class="w-20 rounded border bg-transparent px-1 py-0.5 text-right text-sm dark:border-gray-700"
			bind:value={maxTokens}
			min="0"
			max="4096"
			step="512"
		/>
	</div>
	<input
		id="max-tokens-range"
		type="range"
		bind:value={maxTokens}
		min="0"
		max="4096"
		step="512"
		class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-black dark:bg-gray-700 dark:accent-blue-500"
	/>
</div>
<div class="mt-2">
	<label class="flex cursor-pointer items-center justify-between">
		<input type="checkbox" bind:checked={streaming} class="peer sr-only" />
		<span class="text-sm font-medium text-gray-900 dark:text-gray-300">Streaming</span>
		<div
			class="peer relative h-5 w-9 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-black peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:bg-blue-600"
		></div>
	</label>
</div>
<div class="mt-2">
	<label class="flex cursor-pointer items-center justify-between">
		<input type="checkbox" value="" class="peer sr-only" disabled />
		<span class="text-sm font-medium text-gray-900 dark:text-gray-300">JSON Mode</span>
		<div
			class="peer relative h-5 w-9 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-black peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:bg-blue-600"
		></div>
	</label>
</div>
<div
	class="mt-auto flex max-w-xs flex-col items-start gap-2.5 rounded-lg border bg-white p-4 text-gray-500 shadow dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
	role="alert"
>
	<span class="text-sm font-semibold text-gray-900 dark:text-white">Get more usage</span>
	<div class="text-sm font-normal">Larger models, x10 quota, and advanced features.</div>
	<a
		href="#"
		class="inline-flex rounded-lg bg-black px-2.5 py-1.5 text-center text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:hover:bg-black dark:focus:ring-blue-800"
		>Get PRO ($9/month)</a
	>
</div>
<!-- <div
	class="flex max-w-xs flex-col items-start gap-2.5 rounded-lg border bg-white p-4 text-gray-500 shadow dark:bg-gray-800 dark:text-gray-400"
	role="alert"
>
	<span class="text-sm font-semibold text-gray-900 dark:text-white">Deploy dedicated</span>
	<div class="text-sm font-normal">Deploy your own production ready endpoint</div>
	<a
		href="#"
		class="inline-flex rounded-lg bg-black px-2.5 py-1.5 text-center text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:hover:bg-black dark:focus:ring-blue-800"
		>Deploy dedicated</a
	>
</div> -->
<div>
	<div class="mb-3 flex items-center justify-between gap-2">
		<label for="default-range" class="block text-sm font-medium text-gray-900 dark:text-white"
			>API Quota</label
		>
		<span
			class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300"
			>Free</span
		>

		<div class="ml-auto w-12 text-right text-sm">76%</div>
	</div>
	<div class="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
		<div class="h-2 rounded-full bg-black dark:bg-gray-400" style="width: 75%"></div>
	</div>
</div>
