<script lang="ts">
	export let orgName: string;
	export let size: number = 12;

	async function getAvatarUrl(orgName: string) {
		const url = `https://huggingface.co/api/organizations/${orgName}/avatar`;
		const res = await fetch(url);
		if (!res.ok) {
			console.error(`Error getting avatar url for org: ${orgName}`, res.status, res.statusText);
			return;
		}
		const json = await res.json();
		const { avatarUrl } = json;
		return avatarUrl;
	}
</script>

{#await getAvatarUrl(orgName)}
	<div class="size-{size} flex-none rounded bg-gray-200"></div>
{:then avatarUrl}
	<img class="size-{size} flex-none rounded bg-gray-200 object-cover" src={avatarUrl} alt="{orgName} avatar" />
{:catch}
	<div class="size-{size} flex-none rounded bg-gray-200"></div>
{/await}
