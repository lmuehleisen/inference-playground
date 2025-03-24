<script lang="ts">
	import { onDestroy, type Snippet } from "svelte";
	import { computePosition, autoUpdate } from "@floating-ui/dom";
	import { fly } from "svelte/transition";

	interface Props {
		children: Snippet<[{ addToast: typeof addToast; trigger: typeof trigger }]>;
		closeDelay?: number;
	}
	const { children, closeDelay = 2000 }: Props = $props();

	const id = $props.id();

	const trigger = {
		id,
	} as const;

	type Toast = {
		content: string;
		id: string;
	};

	let toasts = $state<Toast[]>([]);
	let timeouts: ReturnType<typeof window.setTimeout>[] = [];

	function addToast(content: string) {
		const id = crypto.randomUUID();
		const timeout = setTimeout(() => {
			toasts = toasts.filter(t => t.id !== id);
			timeouts = timeouts.filter(t => t !== timeout);
		}, closeDelay);

		toasts.push({ content, id });
		timeouts.push(timeout);
	}

	onDestroy(() => {
		timeouts.forEach(t => clearTimeout(t));
	});

	function float(node: HTMLElement) {
		const triggerEl = document.getElementById(trigger.id);
		if (!triggerEl) return;

		const compute = () =>
			computePosition(triggerEl, node, {
				placement: "top",
				strategy: "absolute",
			}).then(({ x, y }) => {
				Object.assign(node.style, {
					left: `${x}px`,
					top: `${y - 8}px`,
				});
			});

		return {
			destroy: autoUpdate(triggerEl, node, compute),
		};
	}
</script>

{@render children({ trigger, addToast })}

{#each toasts as toast (toast.id)}
	<div
		class="rounded-full border border-blue-400 bg-gradient-to-b from-blue-500 to-blue-600 px-2 py-1 text-xs"
		in:fly={{ y: 10 }}
		out:fly={{ y: -4 }}
		use:float
	>
		{toast.content}
	</div>
{/each}

<style>
	div {
		/* Float on top of the UI */
		position: absolute;

		/* Avoid layout interference */
		width: max-content;
		top: 0;
		left: 0;
	}
</style>
