<script lang="ts">
	import { type ComponentProps, type Extracted } from "melt";
	import { Tooltip, type TooltipProps } from "melt/builders";
	import type { Snippet } from "svelte";

	type FloatingConfig = NonNullable<Extracted<TooltipProps["floatingConfig"]>>;

	interface Props {
		children: Snippet;
		trigger: Snippet<[Tooltip]>;
		placement?: NonNullable<FloatingConfig["computePosition"]>["placement"];
		openDelay?: ComponentProps<TooltipProps>["openDelay"];
	}
	const { children, trigger, placement = "top", openDelay = 500 }: Props = $props();

	const tooltip = new Tooltip({
		forceVisible: true,
		floatingConfig: () => ({
			computePosition: { placement },
			flip: {
				fallbackPlacements: ["bottom"],
				padding: 10,
			},
		}),
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
