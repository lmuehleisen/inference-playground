<script lang="ts">
	import "../app.css";
	import { onMount } from "svelte";
	import { browser } from "$app/environment";
	import { page } from "$app/stores";

	type Theme = "light" | "dark" | "system" | null | undefined;

	let systemPrefersDark = false;

	function updateTheme(theme: Theme, systemPrefersDark: boolean) {
		if (theme === "dark" || (theme === "system" && systemPrefersDark)) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}

	$: if (browser) {
		const theme = $page.url.searchParams.get("__theme") as Theme;
		updateTheme(theme, systemPrefersDark);
	}

	onMount(() => {
		if (browser) {
			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
			systemPrefersDark = mediaQuery.matches;

			const handleChange = (event: MediaQueryListEvent) => {
				systemPrefersDark = event.matches;
				updateTheme($page.url.searchParams.get("__theme") as Theme, systemPrefersDark);
			};

			mediaQuery.addEventListener("change", handleChange);

			return () => mediaQuery.removeEventListener("change", handleChange);
		}
	});
</script>

<slot></slot>

<style></style>
