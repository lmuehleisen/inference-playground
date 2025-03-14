<script lang="ts">
	import { dev } from "$app/environment";
	import { session } from "$lib/stores/session.js";
	import { createPopover } from "@melt-ui/svelte";
	import { prompt } from "./prompts.svelte";
	import { token } from "$lib/stores/token.js";
	import { compareStr } from "$lib/utils/compare.js";
	import type { ToastData } from "./toaster.svelte.js";
	import { addToast } from "./toaster.svelte.js";

	let innerWidth = $state<number>();
	let innerHeight = $state<number>();

	function toggleTheme() {
		document.body.classList.toggle("dark");
	}

	const {
		elements: { trigger, content },
	} = createPopover();

	type Action = {
		label: string;
		cb: () => void;
	};

	const actions: Action[] = [
		{ label: "Toggle Theme", cb: toggleTheme },
		{
			label: "Log session to console",
			cb: () => {
				console.log($session);
			},
		},
		{
			label: "Test prompt",
			cb: async () => {
				console.log(await prompt("Test prompt"));
			},
		},
		{
			label: "Show token modal",
			cb: () => {
				$token.showModal = true;
			},
		},
		{
			label: "Test toast",
			cb: () => {
				const toastData: ToastData[] = [
					{
						title: "Success",
						description: "Congratulations! It worked!",
						variant: "success",
					},
					{
						title: "Warning",
						description: "Please check again.",
						variant: "warning",
					},
					{
						title: "Error",
						description: "Something did not work!",
						variant: "error",
					},
				];

				addToast(
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					toastData[Math.floor(Math.random() * toastData.length)]!
				);
			},
		},
	].toSorted((a, b) => compareStr(a.label, b.label));
</script>

<svelte:window bind:innerWidth bind:innerHeight />

{#if dev}
	<div class="abs-x-center fixed bottom-0 z-50">
		<button class="rounded-t-md bg-gray-500 px-3 py-1 text-xs text-white hover:bg-gray-600" {...$trigger} use:trigger>
			Debug
		</button>

		<div
			class="mb-2 w-128 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
			{...$content}
			use:content
		>
			<h3 class="mb-3 text-lg font-semibold dark:text-white">Debug Menu</h3>

			<div class="space-y-3">
				<div class="text-sm dark:text-gray-300">
					<p>Viewport: {innerWidth}x{innerHeight}</p>
					<p>Environment: {import.meta.env.MODE}</p>
				</div>

				<div class="grid grid-cols-2 gap-2">
					{#each actions as { label, cb }}
						<button
							class="rounded-md bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
							onclick={cb}
						>
							{label}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Add any additional styles here */
</style>
