<script lang="ts">
	import "../app.css";
	import DebugMenu from "$lib/components/DebugMenu.svelte";
	import Prompts from "$lib/components/Prompts.svelte";
</script>

<slot />
<DebugMenu />
<Prompts />
