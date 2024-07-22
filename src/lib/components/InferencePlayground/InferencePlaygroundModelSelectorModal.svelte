<script lang="ts">
	import type { ModelEntryWithTokenizer } from "$lib/types";
	import { createEventDispatcher } from "svelte";
	import IconSearch from "../Icons/IconSearch.svelte";
	import IconStar from "../Icons/IconStar.svelte";

	export let models: ModelEntryWithTokenizer[];

	let backdropEl: HTMLDivElement;

	const dispatch = createEventDispatcher<{ modelSelected: string; close: void }>();

	function handleKeydown(event: KeyboardEvent) {
		// close on ESC
		if (event.key === "Escape") {
			event.preventDefault();
			dispatch("close");
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

<svelte:window on:keydown={handleKeydown} />

<div
	class="fixed inset-0 z-10 flex h-screen items-start justify-center bg-black/85 pt-32"
	bind:this={backdropEl}
	on:click|stopPropagation={handleBackdropClick}
>
	<div class="flex w-full max-w-[600px] items-start justify-center p-10">
		<div class="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-white text-gray-900 shadow-md">
			<div class="flex items-center border-b px-3">
				<IconSearch classNames="mr-2 text-sm" />
				<input
					autofocus
					class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm placeholder-gray-400 outline-none"
					placeholder="Search models ..."
					value=""
				/>
			</div>
			<div class="max-h-[300px] overflow-y-auto overflow-x-hidden">
				<div class="p-1">
					<div class="px-2 py-1.5 text-xs font-medium text-gray-500">Trending</div>
					<div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<IconStar classNames="lucide lucide-star mr-2 h-4 w-4 text-yellow-400" />
							<span class="inline-flex items-center"
								><span class="text-gray-500">meta-llama</span><span class="mx-1 text-black">/</span><span
									class="text-black">Meta-Llama-3-70B-Instruct</span
								></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<IconStar classNames="lucide lucide-star mr-2 h-4 w-4 text-yellow-400" />
							<span class="inline-flex items-center"
								><span class="text-gray-500">mistralai</span><span class="mx-1 text-black">/</span><span
									class="text-black">Mixtral-8x7B-Instruct-v0.1</span
								></span
							>
						</div>
					</div>
				</div>
				<div class="mx-1 h-px bg-gray-200"></div>
				<div class="p-1">
					<div class="px-2 py-1.5 text-xs font-medium text-gray-500">Other Models</div>
					<div>
						{#each models as model}
							{@const [nameSpace, modelName] = model.id.split("/")}
							<button
								class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100"
								on:click={() => {
									dispatch("modelSelected", model.id);
									dispatch("close");
								}}
							>
								<span class="inline-flex items-center"
									><span class="text-gray-500">{nameSpace}</span><span class="mx-1 text-black">/</span><span
										class="text-black">{modelName}</span
									></span
								>
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
