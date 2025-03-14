<script lang="ts">
	import { getActiveProject, session } from "$lib/stores/session";
	import { cn } from "$lib/utils/cn";
	import { createSelect, createSync } from "@melt-ui/svelte";
	import IconCaret from "~icons/carbon/chevron-down";
	import IconCross from "~icons/carbon/close";
	import IconEdit from "~icons/carbon/edit";
	import IconSave from "~icons/carbon/save";
	import IconDelete from "~icons/carbon/trash-can";
	import { prompt } from "../Prompts.svelte";

	let classNames: string = "";
	export { classNames as class };

	$: isDefault = $session.activeProjectId === "default";

	const {
		elements: { trigger, menu, option },
		states: { selected },
	} = createSelect<string, false>();
	const sync = createSync({ selected });
	$: sync.selected({ value: getActiveProject($session).id, label: getActiveProject($session).name }, p => {
		if (!p) return;
		$session.activeProjectId = p?.value;
	});

	async function saveProject() {
		session.saveProject((await prompt("Set project name")) || "Project #" + ($session.projects.length + 1));
	}
</script>

<div class={cn("flex w-full items-stretch gap-2 ", classNames)}>
	<button
		{...$trigger}
		use:trigger
		class={cn(
			"relative flex grow items-center justify-between gap-6 overflow-hidden rounded-lg border bg-gray-100/80 px-3 py-1.5 leading-tight whitespace-nowrap shadow-sm",
			"hover:brightness-95 dark:border-gray-700 dark:bg-gray-800 dark:hover:brightness-110"
		)}
	>
		<div class="flex items-center gap-1 text-sm">
			{getActiveProject($session).name}
		</div>
		<div
			class="absolute right-2 grid size-4 flex-none place-items-center rounded-sm bg-gray-100 text-xs dark:bg-gray-600"
		>
			<IconCaret />
		</div>
	</button>
	{#if isDefault}
		<button class="btn size-[32px] p-0" on:click={saveProject}>
			<IconSave />
		</button>
	{:else}
		<button class="btn size-[32px] p-0" on:click={() => ($session.activeProjectId = "default")}>
			<IconCross />
		</button>
	{/if}
</div>

<div {...$menu} use:menu class="rounded-lg border bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
	{#each $session.projects as { name, id } (id)}
		<button {...$option({ value: id, label: name })} use:option class="group block w-full p-1 text-sm dark:text-white">
			<div
				class="flex items-center gap-2 rounded-md py-1.5 pr-1 pl-2 group-data-[highlighted]:bg-gray-200 dark:group-data-[highlighted]:bg-gray-700"
			>
				{name}
				{#if id !== "default"}
					<div class="ml-auto flex items-center gap-1">
						<button
							class="grid place-items-center rounded-md p-1 text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
							on:click={async e => {
								e.stopPropagation();
								session.updateProject(id, { name: (await prompt("Edit project name", name)) || name });
							}}
						>
							<IconEdit />
						</button>
						<button
							class="grid place-items-center rounded-md p-1 text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
							on:click={e => {
								e.stopPropagation();
								session.deleteProject(id);
							}}
						>
							<IconDelete />
						</button>
					</div>
				{/if}
			</div>
		</button>
	{/each}
</div>
