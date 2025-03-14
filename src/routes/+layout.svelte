<script lang="ts">
	import "../app.css";
	import DebugMenu from "$lib/components/DebugMenu.svelte";
	import Prompts from "$lib/components/Prompts.svelte";
	import Toaster from "$lib/components/toaster.svelte";
</script>

<slot />
<DebugMenu />
<Prompts />
<Toaster />
