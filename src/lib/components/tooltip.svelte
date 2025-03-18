<script lang="ts">
	import { Tooltip, type TooltipProps } from "melt/builders";
	import { type ComponentProps, type Extracted } from "melt";
	import type { Snippet } from "svelte";

	interface Props {
		children: Snippet;
		trigger: Snippet<[Tooltip]>;
		placement?: NonNullable<Extracted<TooltipProps["computePositionOptions"]>>["placement"];
		openDelay?: ComponentProps<TooltipProps>["openDelay"];
	}
	const { children, trigger, placement = "top", openDelay }: Props = $props();

	const tooltip = new Tooltip({
		forceVisible: true,
		computePositionOptions: () => ({ placement }),
		openDelay: () => openDelay,
	});
</script>

{@render trigger(tooltip)}

<div {...tooltip.content} class="rounded-xl bg-white p-0 shadow-xl dark:bg-gray-700">
	<div {...tooltip.arrow} class="rounded-tl"></div>
	<p class="px-4 py-1 text-gray-700 dark:text-white">{@render children()}</p>
</div>

<style>
	[data-melt-tooltip-content] {
		border: 0;

		position: absolute;
		pointer-events: none;
		opacity: 0;

		transform: scale(0.9);

		transition: 0.3s;
		transition-property: opacity, transform;
	}

	[data-melt-tooltip-content][data-open] {
		pointer-events: auto;
		opacity: 1;

		transform: scale(1);
	}
</style>
