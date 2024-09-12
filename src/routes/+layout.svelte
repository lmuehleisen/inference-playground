<script>
	import "../app.css";
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	$: if (browser && $page.url.searchParams.get('__theme') === 'dark') {
		document.documentElement.classList.add('dark');
	}
</script>

<slot></slot>

<style></style>
