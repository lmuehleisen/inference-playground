<script lang="ts">
	interface Props {
		class?: string;
		size?: "xs" | "sm" | "md";
	}

	let { class: classNames = "", size = "md" }: Props = $props();

	const sizeClasses: Record<string, string> = {
		xs: "rounded-md px-1 py-0",
		sm: "rounded-md px-1.5 py-0",
		md: "rounded-lg px-2.5 py-0.5",
	};
</script>

<span
	class="inline-block -skew-x-12 border border-gray-200 bg-linear-to-br from-pink-300 via-emerald-200 to-yellow-200
	text-sm font-bold text-black shadow-lg shadow-emerald-500/10 dark:border-gray-800
	dark:from-pink-500 dark:via-emerald-500 dark:to-yellow-500 dark:text-black dark:shadow-emerald-500/20
	{sizeClasses[size]} {classNames}"
>
	PRO
</span>
