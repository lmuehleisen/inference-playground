<script lang="ts">
	import { getActiveProject, session } from "$lib/stores/session";
	import { cn } from "$lib/utils/cn";
	import { createSelect, createSync } from "@melt-ui/svelte";
	import IconCaret from "../Icons/IconCaret.svelte";
	import IconProvider from "../Icons/IconProvider.svelte";

	const {
		elements: { trigger, menu, option },
		states: { selected },
	} = createSelect<string, false>();
	const sync = createSync({ selected });
	$: sync.selected({ value: getActiveProject($session).id, label: getActiveProject($session).name }, p => {
		if (p) $session.activeProjectId = p?.value;
	});
</script>

<div class="flex flex-col gap-2">
	<!--
	<label class="flex items-baseline gap-2 text-sm font-medium text-gray-900 dark:text-white">
		Providers<span class="text-xs font-normal text-gray-400"></span>
	</label>
	-->

	<button
		{...$trigger}
		use:trigger
		class={cn(
			"relative flex items-center justify-between gap-6 overflow-hidden rounded-lg border bg-gray-100/80 px-3 py-1.5 leading-tight whitespace-nowrap shadow-sm",
			"hover:brightness-95 dark:border-gray-700 dark:bg-gray-800 dark:hover:brightness-110"
		)}
	>
		<div class="flex items-center gap-1 text-sm">
			{getActiveProject($session).name}
		</div>
		<IconCaret classNames="text-xl bg-gray-100 dark:bg-gray-600 rounded-sm size-4 flex-none absolute right-2" />
	</button>

	<div {...$menu} use:menu class="rounded-lg border bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
		{#each $session.projects as { name, id } (id)}
			<button
				{...$option({ value: id, label: name })}
				use:option
				class="group block w-full p-1 text-sm dark:text-white"
			>
				<div
					class="flex items-center gap-2 rounded-md px-2 py-1.5 group-data-[highlighted]:bg-gray-200 dark:group-data-[highlighted]:bg-gray-700"
				>
					{name}
				</div>
			</button>
		{/each}
	</div>
</div>
