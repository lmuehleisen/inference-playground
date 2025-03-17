<script lang="ts" module>
	let open = $state(true);

	export function showQuotaModal() {
		open = true;
	}
</script>

<script lang="ts">
	import { clickOutside } from "$lib/actions/click-outside.js";
	import IconCross from "~icons/carbon/close";
	import IconCheck from "~icons/carbon/checkmark";
	import IconExternal from "~icons/carbon/arrow-up-right";
	import { fade, scale } from "svelte/transition";
	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (open) {
			dialog?.showModal();
		} else {
			setTimeout(() => dialog?.close(), 250);
		}
	});
</script>

{#snippet pro()}
	<span
		class="inline-block -skew-x-12 rounded-md border border-gray-200 bg-linear-to-br from-pink-300 via-green-200 to-yellow-200 px-1.5 py-0 text-sm font-bold text-black shadow-lg shadow-green-500/10 dark:border-gray-800 dark:from-pink-500 dark:via-green-500 dark:to-yellow-500 dark:text-black dark:shadow-green-500/20"
	>
		PRO
	</span>
{/snippet}

<dialog class="backdrop:bg-transparent" bind:this={dialog} onclose={() => (open = false)}>
	{#if open}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 backdrop-blur-sm"
			transition:fade={{ duration: 150 }}
		>
			<div
				class="relative w-3xl rounded-lg bg-white shadow-sm dark:bg-gray-900"
				use:clickOutside={() => (open = false)}
				transition:scale={{ start: 0.975, duration: 250 }}
			>
				<div class="flex items-center justify-between rounded-t border-b p-4 md:px-5 md:py-4 dark:border-gray-800">
					<h3 class="flex items-center gap-2.5 text-lg font-semibold text-gray-900 dark:text-white">
						<img
							alt="Hugging Face's logo"
							class="w-7"
							src="https://huggingface.co/front/assets/huggingface_logo-noborder.svg"
						/> Increase your usage limits
					</h3>
					<button
						type="button"
						class="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
						onclick={() => (open = false)}
					>
						<div class="text-xl">
							<IconCross />
						</div>
						<span class="sr-only">Close modal</span>
					</button>
				</div>
				<!-- Modal body -->
				<div class="flex flex-col gap-2 p-4 text-white md:p-5">
					<p>
						It seems you have reached your usage limits. If you want to continue using the playground, please consider
						creating a {@render pro()} account!
					</p>
					<p>You'll also gain access to:</p>
					<div
						class="grid grid-cols-1 flex-col gap-2 text-base text-gray-500 md:col-span-3 md:grid-cols-2 md:flex-row dark:text-gray-400"
					>
						<ul class="grid gap-1">
							<li class="flex items-start">
								<IconCheck class="text-md shrink-0 pt-2" />
								<p>
									<a
										href="/spaces/enzostvs/zero-gpu-spaces"
										class="font-semibold whitespace-nowrap text-gray-700 underline decoration-gray-400 hover:text-gray-900 hover:decoration-gray-600 dark:text-gray-200 dark:hover:text-gray-200 dark:hover:decoration-gray-300"
										target="_blank">ZeroGPU</a
									>: Get 5x usage quota and highest GPU queue priority
								</p>
							</li>
							<li class="flex items-start">
								<IconCheck class="text-md shrink-0 pt-2" />
								<p>
									<a
										href="/docs/hub/spaces-zerogpu"
										class="font-semibold whitespace-nowrap text-gray-700 underline decoration-gray-400 hover:text-gray-900 hover:decoration-gray-600 dark:text-gray-200 dark:hover:text-gray-200 dark:hover:decoration-gray-300"
										target="_blank">Spaces Hosting</a
									>: Create ZeroGPU Spaces with A100 hardware
								</p>
							</li>
							<li class="flex items-start">
								<IconCheck class="text-md shrink-0 pt-2" />
								<p>
									<a
										href="/docs/hub/spaces-dev-mode"
										class="font-semibold whitespace-nowrap text-gray-700 underline decoration-gray-400 hover:text-gray-900 hover:decoration-gray-600 dark:text-gray-200 dark:hover:text-gray-200 dark:hover:decoration-gray-300"
										target="_blank">Spaces Dev Mode</a
									>: Fast iterations via SSH/VS Code for Spaces
								</p>
							</li>

							<li class="flex items-start">
								<IconCheck class="text-md shrink-0 pt-2" />
								<p>
									<a
										href="https://huggingface.co/blog/inference-providers"
										class="font-semibold whitespace-nowrap text-gray-700 underline decoration-gray-400 hover:text-gray-900 hover:decoration-gray-600 dark:text-gray-200 dark:hover:text-gray-200 dark:hover:decoration-gray-300"
										target="_blank">Inference Providers</a
									>: Get $2 included credits across all Inference Providers
								</p>
							</li>
						</ul>
						<ul class="grid gap-1">
							<li class="flex items-start">
								<IconCheck class="text-md shrink-0 pt-2" />
								<p>
									<a
										href="/docs/hub/datasets-viewer"
										class="font-semibold whitespace-nowrap text-gray-700 underline decoration-gray-400 hover:text-gray-900 hover:decoration-gray-600 dark:text-gray-200 dark:hover:text-gray-200 dark:hover:decoration-gray-300"
										target="_blank">Dataset Viewer</a
									>: Activate it on private datasets
								</p>
							</li>
							<li class="flex items-start">
								<IconCheck class="text-md shrink-0 pt-2" />
								<p>
									<a
										href="/blog"
										class="font-semibold whitespace-nowrap text-gray-700 underline decoration-gray-400 hover:text-gray-900 hover:decoration-gray-600 dark:text-gray-200 dark:hover:text-gray-200 dark:hover:decoration-gray-300"
										target="_blank">Blog Articles</a
									>: Publish articles to the Hugging Face blog
								</p>
							</li>
							<li class="flex items-start">
								<IconCheck class="text-md shrink-0 pt-2" />
								<p>
									<a
										href="/posts"
										class="font-semibold whitespace-nowrap text-gray-700 underline decoration-gray-400 hover:text-gray-900 hover:decoration-gray-600 dark:text-gray-200 dark:hover:text-gray-200 dark:hover:decoration-gray-300"
										target="_blank">Social Posts</a
									>: Share short updates with the community
								</p>
							</li>

							<li class="flex items-start">
								<IconCheck class="text-md shrink-0 pt-2" />
								<p>
									<span class="font-semibold text-gray-700 dark:text-gray-200">Features Preview</span>: Get early access
									to upcoming features
								</p>
							</li>
							<li class="flex items-start">
								<IconCheck class="text-md shrink-0 pt-2" />
								<p>
									{@render pro()}<span class="ml-1.5 font-semibold text-gray-700 dark:text-gray-200">Badge</span>: Show
									your support on your profile
								</p>
							</li>
						</ul>
					</div>
				</div>

				<!-- Modal footer -->
				<div class="flex rounded-b border-t border-gray-200 p-4 md:p-5 dark:border-gray-800">
					<a
						class="ml-auto flex items-center gap-1.5 rounded-lg bg-black px-4 py-2.5 pl-3 text-sm font-medium text-white hover:bg-gray-900 focus:ring-4 focus:ring-gray-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
						href="https://huggingface.co/settings/billing/subscription#subscribe"
						target="_blank"
					>
						<IconExternal />
						Get Pro ($9/month)
					</a>
				</div>
			</div>
		</div>
	{/if}
</dialog>
