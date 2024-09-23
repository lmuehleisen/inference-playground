<script lang="ts">
	import type { Conversation, ModelEntryWithTokenizer } from "./types";

	import { createEventDispatcher, tick } from "svelte";

	import { FEATURED_MODELS_IDS } from "./inferencePlaygroundUtils";
	import IconSearch from "../Icons/IconSearch.svelte";
	import IconStar from "../Icons/IconStar.svelte";

	export let models: ModelEntryWithTokenizer[];
	export let conversation: Conversation;

	let backdropEl: HTMLDivElement;
	let highlightIdx = 0;
	let ignoreCursorHighlight = false;
	let containerEl: HTMLDivElement;

	const dispatch = createEventDispatcher<{ modelSelected: string; close: void }>();

	let featuredModels = models.filter(m => FEATURED_MODELS_IDS.includes(m.id));
	let otherModels = models.filter(m => !FEATURED_MODELS_IDS.includes(m.id));

	if (featuredModels.findIndex(model => model.id === conversation.model.id) !== -1) {
		highlightIdx = featuredModels.findIndex(model => model.id === conversation.model.id);
	} else {
		highlightIdx = featuredModels.length + otherModels.findIndex(model => model.id === conversation.model.id);
	}

	function handleKeydown(event: KeyboardEvent) {
		const { key } = event;
		let scrollLogicalPosition: ScrollLogicalPosition = "end";
		if (key === "Escape") {
			event.preventDefault();
			dispatch("close");
		} else if (key === "Enter") {
			event.preventDefault();
			const highlightedEl = document.querySelector(".highlighted");
			if (highlightedEl) {
				(highlightedEl as HTMLButtonElement).click();
			}
		} else if (key === "ArrowUp") {
			event.preventDefault();
			highlightIdx--;
			scrollLogicalPosition = "start";
			ignoreCursorHighlight = true;
		} else if (key === "ArrowDown") {
			event.preventDefault();
			highlightIdx++;
			ignoreCursorHighlight = true;
		}
		const n = featuredModels.length + otherModels.length;
		highlightIdx = ((highlightIdx % n) + n) % n;
		scrollToResult(scrollLogicalPosition);
	}

	async function scrollToResult(block: ScrollLogicalPosition) {
		await tick();
		const highlightedEl = document.querySelector(".highlighted");
		if (containerEl && highlightedEl) {
			const { bottom: containerBottom, top: containerTop } = containerEl.getBoundingClientRect();
			const { bottom: highlightedBottom, top: highlightedTop } = highlightedEl.getBoundingClientRect();
			if (highlightedBottom > containerBottom || containerTop > highlightedTop) {
				highlightedEl.scrollIntoView({ block });
			}
		}
	}

	function highlightRow(idx: number) {
		if (!ignoreCursorHighlight) {
			highlightIdx = idx;
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (window?.getSelection()?.toString()) {
			return;
		}
		if (event.target === backdropEl) {
			dispatch("close");
		}
	}

	function filterModels(query: string) {
		featuredModels = models.filter(m =>
			query
				? FEATURED_MODELS_IDS.includes(m.id) && m.id.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())
				: FEATURED_MODELS_IDS.includes(m.id)
		);

		otherModels = models.filter(m =>
			query
				? !FEATURED_MODELS_IDS.includes(m.id) && m.id.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())
				: !FEATURED_MODELS_IDS.includes(m.id)
		);
	}
</script>

<svelte:window on:keydown={handleKeydown} on:mousemove={() => (ignoreCursorHighlight = false)} />

<!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
<div
	class="fixed inset-0 z-10 flex h-screen items-start justify-center bg-black/85 pt-32"
	bind:this={backdropEl}
	on:click|stopPropagation={handleBackdropClick}
>
	<div class="flex w-full max-w-[600px] items-start justify-center overflow-hidden whitespace-nowrap p-10">
		<div
			class="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-white text-gray-900 shadow-md dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
			bind:this={containerEl}
		>
			<div class="flex items-center border-b px-3 dark:border-gray-800">
				<IconSearch classNames="mr-2 text-sm" />
				<!-- svelte-ignore a11y-autofocus -->
				<input
					autofocus
					class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm placeholder-gray-400 outline-none"
					placeholder="Search models ..."
					on:input={e => filterModels(e.currentTarget.value)}
				/>
			</div>
			<div class="max-h-[300px] overflow-y-auto overflow-x-hidden">
				{#if featuredModels.length}
					<div>
						<div class="px-2 py-1.5 text-xs font-medium text-gray-500">Trending</div>
						<div>
							{#each featuredModels as model, idx}
								{@const [nameSpace, modelName] = model.id.split("/")}
								<button
									class="flex w-full cursor-pointer items-center px-2 py-1.5 text-sm {highlightIdx === idx
										? 'highlighted bg-gray-100 dark:bg-gray-800'
										: ''}"
									on:mouseenter={() => highlightRow(idx)}
									on:click={() => {
										dispatch("modelSelected", model.id);
										dispatch("close");
									}}
								>
									<IconStar classNames="lucide lucide-star mr-1.5 size-4 text-yellow-400" />
									<span class="inline-flex items-center"
										><span class="text-gray-500 dark:text-gray-400">{nameSpace}</span><span
											class="mx-1 text-gray-300 dark:text-gray-700">/</span
										><span class="text-black dark:text-white">{modelName}</span></span
									>
								</button>
							{/each}
						</div>
					</div>
				{/if}
				{#if otherModels.length}
					<div>
						<div class="px-2 py-1.5 text-xs font-medium text-gray-500">Other Models</div>
						<div>
							{#each otherModels as model, _idx}
								{@const [nameSpace, modelName] = model.id.split("/")}
								{@const idx = featuredModels.length + _idx}
								<button
									class="flex w-full cursor-pointer items-center px-2 py-1.5 text-sm {highlightIdx === idx
										? 'highlighted bg-gray-100 dark:bg-gray-800'
										: ''}"
									on:mouseenter={() => highlightRow(idx)}
									on:click={() => {
										dispatch("modelSelected", model.id);
										dispatch("close");
									}}
								>
									<span class="inline-flex items-center"
										><span class="text-gray-500 dark:text-gray-400">{nameSpace}</span><span
											class="mx-1 text-gray-300 dark:text-gray-700">/</span
										><span class="text-black dark:text-white">{modelName}</span></span
									>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
