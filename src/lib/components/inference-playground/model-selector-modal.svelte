<script lang="ts">
	import type { Conversation } from "$lib/types.js";

	import { createEventDispatcher, onMount, tick } from "svelte";

	import { models } from "$lib/state/models.svelte.js";
	import fuzzysearch from "$lib/utils/search.js";
	import IconSearch from "~icons/carbon/search";
	import IconStar from "~icons/carbon/star";

	interface Props {
		conversation: Conversation;
	}

	let { conversation }: Props = $props();

	let backdropEl = $state<HTMLDivElement>();
	let highlightIdx = $state(0);
	let ignoreCursorHighlight = $state(false);
	let containerEl = $state<HTMLDivElement>();
	let query = $state("");

	const dispatch = createEventDispatcher<{ modelSelected: string; close: void }>();

	let featuredModels = $derived(fuzzysearch({ needle: query, haystack: models.trending, property: "id" }));
	let otherModels = $derived(fuzzysearch({ needle: query, haystack: models.all, property: "id" }));

	onMount(() => {
		if (featuredModels.findIndex(model => model.id === conversation.model.id) !== -1) {
			highlightIdx = featuredModels.findIndex(model => model.id === conversation.model.id);
		} else {
			highlightIdx = featuredModels.length + otherModels.findIndex(model => model.id === conversation.model.id);
		}
	});

	type ScrollLogicalPosition = "center" | "end" | "nearest" | "start";

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
		event.stopPropagation();
		if (window?.getSelection()?.toString()) {
			return;
		}
		if (event.target === backdropEl) {
			dispatch("close");
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} onmousemove={() => (ignoreCursorHighlight = false)} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="fixed inset-0 z-10 flex h-screen items-start justify-center bg-black/85 pt-32"
	bind:this={backdropEl}
	onclick={handleBackdropClick}
>
	<div class="flex w-full max-w-[600px] items-start justify-center overflow-hidden p-10 text-left whitespace-nowrap">
		<div
			class="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-white text-gray-900 shadow-md dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
			bind:this={containerEl}
		>
			<div class="flex items-center border-b px-3 dark:border-gray-800">
				<div class="mr-2 text-sm">
					<IconSearch />
				</div>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					autofocus
					class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm placeholder-gray-400 outline-hidden"
					placeholder="Search models ..."
					bind:value={query}
				/>
			</div>
			<div class="max-h-[300px] overflow-x-hidden overflow-y-auto">
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
									onmouseenter={() => highlightRow(idx)}
									onclick={() => {
										dispatch("modelSelected", model.id);
										dispatch("close");
									}}
								>
									<div class="lucide lucide-star mr-1.5 size-4 text-yellow-400">
										<IconStar />
									</div>
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
									onmouseenter={() => highlightRow(idx)}
									onclick={() => {
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
