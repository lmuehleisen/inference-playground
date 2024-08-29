<script lang="ts">
	import type { Conversation, ModelEntryWithTokenizer } from "./types";

	import { createEventDispatcher, tick } from "svelte";

	import { FEATUED_MODELS_IDS } from "./inferencePlaygroundUtils";
	import IconSearch from "../Icons/IconSearch.svelte";
	import IconStar from "../Icons/IconStar.svelte";

	export let models: ModelEntryWithTokenizer[];
	export let conversation: Conversation;

	let backdropEl: HTMLDivElement;
	let query = "";
	let highlightIdx = 0;
	let ignoreCursorHighlight = false;
	let containerEl: HTMLDivElement;

	const dispatch = createEventDispatcher<{ modelSelected: string; close: void }>();

	const featuredModels = models.filter(m =>
		query
			? FEATUED_MODELS_IDS.includes(m.id) && m.id.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())
			: FEATUED_MODELS_IDS.includes(m.id)
	);
	const otherModels = models.filter(m =>
		query
			? !FEATUED_MODELS_IDS.includes(m.id) && m.id.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())
			: !FEATUED_MODELS_IDS.includes(m.id)
	);

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
		const n = models.length;
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
</script>

<svelte:window on:keydown={handleKeydown} on:mousemove={() => (ignoreCursorHighlight = false)} />

<div
	class="fixed inset-0 z-10 flex h-screen items-start justify-center bg-black/85 pt-32"
	bind:this={backdropEl}
	on:click|stopPropagation={handleBackdropClick}
>
	<div class="flex w-full max-w-[600px] items-start justify-center p-10 whitespace-nowrap overflow-hidden">
		<div class="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-white text-gray-900 shadow-md" bind:this={containerEl}>
			<div class="flex items-center border-b px-3">
				<IconSearch classNames="mr-2 text-sm" />
				<input
					autofocus
					class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm placeholder-gray-400 outline-none"
					placeholder="Search models ..."
					bind:value={query}
				/>
			</div>
			<div class="max-h-[300px] overflow-y-auto overflow-x-hidden">
				<div class="p-1">
					<div class="px-2 py-1.5 text-xs font-medium text-gray-500">Trending</div>
					<div>
						{#each featuredModels as model, idx}
							{@const [nameSpace, modelName] = model.id.split("/")}
							<button
								class="flex w-full cursor-pointer items-center px-2 py-1.5 text-sm {highlightIdx === idx
									? 'highlighted bg-gray-100 dark:bg-gray-700'
									: ''}"
								on:mouseenter={() => highlightRow(idx)}
								on:click={() => {
									dispatch("modelSelected", model.id);
									dispatch("close");
								}}
							>
								<IconStar classNames="lucide lucide-star mr-2 h-4 w-4 text-yellow-400" />
								<span class="inline-flex items-center"
									><span class="text-gray-500 dark:text-gray-400">{nameSpace}</span><span
										class="mx-1 text-black dark:text-white">/</span
									><span class="text-black dark:text-white">{modelName}</span></span
								>
							</button>
						{/each}
					</div>
				</div>
				<div class="mx-1 h-px bg-gray-200 dark:bg-gray-700"></div>
				<div class="p-1">
					<div class="px-2 py-1.5 text-xs font-medium text-gray-500">Other Models</div>
					<div>
						{#each otherModels as model, _idx}
							{@const [nameSpace, modelName] = model.id.split("/")}
							{@const idx = featuredModels.length + _idx}
							<button
								class="flex w-full cursor-pointer items-center px-2 py-1.5 text-sm {highlightIdx === idx
									? 'highlighted bg-gray-100 dark:bg-gray-700'
									: ''}"
								on:mouseenter={() => highlightRow(idx)}
								on:click={() => {
									dispatch("modelSelected", model.id);
									dispatch("close");
								}}
							>
								<span class="inline-flex items-center"
									><span class="text-gray-500 dark:text-gray-400">{nameSpace}</span><span
										class="mx-1 text-black dark:text-white">/</span
									><span class="text-black dark:text-white">{modelName}</span></span
								>
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
