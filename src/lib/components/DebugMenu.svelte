<script lang="ts">
	import { dev } from "$app/environment";
	import { createPopover } from "@melt-ui/svelte";

	let innerWidth: number;
	let innerHeight: number;
	let isDarkMode: boolean;

	function toggleTheme() {
		document.body.classList.toggle("dark");
	}

	const {
		elements: { trigger, content },
	} = createPopover();
</script>

<svelte:window bind:innerWidth bind:innerHeight />

{#if dev}
	<div class="abs-x-center fixed bottom-0 z-50">
		<button class="rounded-t-md bg-gray-500 px-3 py-1 text-xs text-white hover:bg-gray-600" {...$trigger} use:trigger>
			Debug
		</button>

		<div
			class="mb-2 w-64 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
			{...$content}
			use:content
		>
			<h3 class="mb-3 text-lg font-semibold dark:text-white">Debug Menu</h3>

			<div class="space-y-3">
				<div class="text-sm dark:text-gray-300">
					<p>Viewport: {innerWidth}x{innerHeight}</p>
					<p>Environment: {import.meta.env.MODE}</p>
				</div>

				<div class="flex flex-col gap-2">
					<button
						class="rounded-md bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
						on:click={toggleTheme}
					>
						Toggle Theme
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Add any additional styles here */
</style>

