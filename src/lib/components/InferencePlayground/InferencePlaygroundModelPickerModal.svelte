<script lang="ts">
	import type { ModelEntryWithTokenizer } from '$lib/types';
	import { createEventDispatcher } from 'svelte';

	export let models: ModelEntryWithTokenizer[];

	let backdropEl: HTMLDivElement;

	const dispatch = createEventDispatcher<{ modelSelected: string; close: void }>();

	function handleKeydown(event: KeyboardEvent) {
		// close on ESC
		if (event.key === 'Escape') {
			event.preventDefault();
			dispatch('close');
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (window?.getSelection()?.toString()) {
			return;
		}
		if (event.target === backdropEl) {
			dispatch('close');
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
		<div
			class="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-white text-gray-900 shadow-md"
		>
			<div class="flex items-center border-b px-3">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="mr-2 text-sm"
					width="1em"
					height="1em"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="11" cy="11" r="8"></circle>
					<path d="m21 21-4.3-4.3"></path>
				</svg>
				<input
					autofocus
					class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm placeholder-gray-400 outline-none"
					placeholder="Search models..."
					value=""
				/>
			</div>
			<div class="max-h-[300px] overflow-y-auto overflow-x-hidden">
				<div class="p-1">
					<div class="px-2 py-1.5 text-xs font-medium text-gray-500">Trending</div>
					<div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="lucide lucide-star mr-2 h-4 w-4 text-yellow-400"
								><polygon
									points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
								></polygon></svg
							>
							<span class="inline-flex items-center"
								><span class="text-gray-500">meta-llama</span><span class="mx-1 text-black">/</span
								><span class="text-black">Meta-Llama-3-70B-Instruct</span></span
							>
						</div>
						<div class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="lucide lucide-star mr-2 h-4 w-4 text-yellow-400"
								><polygon
									points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
								></polygon></svg
							>
							<span class="inline-flex items-center"
								><span class="text-gray-500">mistralai</span><span class="mx-1 text-black">/</span
								><span class="text-black">Mixtral-8x7B-Instruct-v0.1</span></span
							>
						</div>
					</div>
				</div>
				<div class="mx-1 h-px bg-gray-200"></div>
				<div class="p-1">
					<div class="px-2 py-1.5 text-xs font-medium text-gray-500">Other Models</div>
					<div>
						{#each models as model}
							{@const [nameSpace, modelName] = model.id.split('/')}
							<button
								class="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-gray-100"
								on:click={() => {
									dispatch('modelSelected', model.id);
									dispatch('close');
								}}
							>
								<span class="inline-flex items-center"
									><span class="text-gray-500">{nameSpace}</span><span class="mx-1 text-black"
										>/</span
									><span class="text-black">{modelName}</span></span
								>
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
