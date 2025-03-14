<script lang="ts">
	import { fly } from "svelte/transition";
	import { toaster } from "./toaster.svelte.js";
	import { Progress } from "melt/components";
	import Close from "~icons/carbon/close";
</script>

<div {...toaster.root} class="fixed !right-4 !bottom-4 flex w-[300px] flex-col" style:--toasts={toaster.toasts.length}>
	{#each toaster.toasts as toast, i (toast.id)}
		<div
			class="relative flex h-(--toast-height) w-full flex-col justify-center rounded-xl bg-white px-4 text-left transition dark:bg-gray-800"
			{...toast.content}
			style:--n={toaster.toasts.length - i}
			in:fly={{ y: 60, opacity: 0.9 }}
			out:fly={{ y: 20 }}
		>
			<h3 {...toast.title} class="text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300">
				{toast.data.title}
			</h3>

			{#if toast.data.description}
				<div {...toast.description} class="text-xs text-gray-700 dark:text-gray-300">
					{toast.data.description}
				</div>
			{/if}

			<button
				{...toast.close}
				aria-label="dismiss toast"
				class="absolute top-2 right-2 bg-transparent text-gray-300 hover:text-gray-400 dark:hover:text-gray-100"
			>
				<Close class="size-4" />
			</button>

			{#if toast.closeDelay !== 0}
				<div class="absolute right-4 bottom-4 h-[4px] w-[30px] overflow-hidden rounded-full">
					<Progress value={toast.percentage}>
						{#snippet children(progress)}
							<div {...progress.root} class="relative h-full w-full overflow-hidden bg-gray-200 dark:bg-gray-950">
								<div
									{...progress.progress}
									class="h-full w-full -translate-x-(--progress)"
									class:bg-green-400={toast.data.variant === "success"}
									class:bg-orange-400={toast.data.variant === "warning"}
									class:bg-red-500={toast.data.variant === "error"}
								></div>
							</div>
						{/snippet}
					</Progress>
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	:global([popover]) {
		inset: unset;
	}

	[data-melt-toaster-root] {
		--gap: 0.75rem;
		--hover-offset: 0rem;
		--toast-height: 4rem;
		--hidden-offset: 0.75rem;

		--hidden-toasts: calc(var(--toasts) - 1);

		overflow: visible;
		display: grid;
		grid-template-rows: var(--toast-height) repeat(var(--hidden-toasts), var(--hidden-offset));
		grid-template-columns: 1fr;
		gap: 0;
		background: unset;
		padding: 0;
	}

	[data-melt-toaster-root]:hover {
		grid-template-rows: var(--hidden-offset) var(--toast-height) repeat(
				var(--hidden-toasts),
				calc(var(--toast-height) + var(--gap))
			);
	}

	[data-melt-toaster-toast-content] {
		position: absolute;
		pointer-events: auto;
		bottom: 0;
		left: 0;
		box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);

		transform-origin: 50% 0%;
		transition: all 350ms ease;
	}

	:global([data-theme="dark"] [data-melt-toaster-toast-content]) {
		box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.5);
	}

	[data-melt-toaster-toast-content]:nth-last-child(n + 4) {
		z-index: 1;
		scale: 0.925;
		opacity: 0;
		translate: 0 calc(-3 * var(--hidden-offset));
	}

	[data-melt-toaster-toast-content]:nth-last-child(-n + 3) {
		z-index: 2;
		scale: 0.95;
		translate: 0 calc(-2 * var(--hidden-offset));
	}

	[data-melt-toaster-toast-content]:nth-last-child(-n + 2) {
		z-index: 3;
		scale: 0.975;
		translate: 0 calc(-1 * var(--hidden-offset));
	}

	[data-melt-toaster-toast-content]:nth-last-child(-n + 1) {
		z-index: 4;
		scale: 1;
		translate: 0;
	}

	[data-melt-toaster-root]:hover [data-melt-toaster-toast-content] {
		scale: 1;
		opacity: 1;
		--toast-gap: calc(calc(var(--gap) * var(--n)) + var(--hover-offset));
		--percentage: calc(-100% * calc(var(--n) - 1));
		translate: 0 calc(var(--percentage) - var(--toast-gap));
	}
</style>
