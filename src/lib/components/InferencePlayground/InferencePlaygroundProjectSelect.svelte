<script lang="ts">
	import { getActiveProject, session } from "$lib/stores/session";
	import { cn } from "$lib/utils/cn";
	import { createSelect, createSync } from "@melt-ui/svelte";
	import IconCaret from "../Icons/IconCaret.svelte";
	import IconDelete from "../Icons/IconDelete.svelte";

	let classNames: string = "";
	export { classNames as class };

	const newProjectId = "__new-project-i-hope-no-one-uses-this-as-an-id__";

	const {
		elements: { trigger, menu, option },
		states: { selected, open },
	} = createSelect<string, false>();
	const sync = createSync({ selected });
	$: sync.selected({ value: getActiveProject($session).id, label: getActiveProject($session).name }, p => {
		if (p?.value === newProjectId) {
			session.addProject("Project #" + ($session.projects.length + 1));
		} else if (p) {
			$session.activeProjectId = p?.value;
		}
	});
</script>

<div class="flex flex-col gap-2">
	<button
		{...$trigger}
		use:trigger
		class={cn(
			"relative flex items-center justify-between gap-6 overflow-hidden rounded-lg border bg-gray-100/80 px-3 py-1.5 leading-tight whitespace-nowrap shadow-sm",
			"hover:brightness-95 dark:border-gray-700 dark:bg-gray-800 dark:hover:brightness-110",
			classNames
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
					<button
						class="ml-auto grid place-items-center rounded-md p-1 hover:bg-gray-300 dark:hover:bg-gray-600"
						on:click={e => {
							e.stopPropagation();
							session.deleteProject(id);
						}}
					>
						<IconDelete />
					</button>
				</div>
			</button>
		{/each}
		<button {...$option({ value: newProjectId })} use:option class="group block w-full p-1 text-sm dark:text-white">
			<div
				class="flex items-center gap-2 rounded-md px-2 py-1.5 group-data-[highlighted]:bg-gray-200 dark:group-data-[highlighted]:bg-gray-700"
			>
				Add new project
			</div>
		</button>
	</div>
</div>
