<script lang="ts">
	import "../app.css";
	import DebugMenu from "$lib/components/debug-menu.svelte";
	import Prompts from "$lib/components/prompts.svelte";
	import Toaster from "$lib/components/toaster.svelte";
	import QuotaModal from "$lib/components/quota-modal.svelte";
	interface Props {
		children?: import("svelte").Snippet;
	}

	let { children }: Props = $props();
</script>

{@render children?.()}
<DebugMenu />
<Prompts />
<Toaster />
<QuotaModal />
