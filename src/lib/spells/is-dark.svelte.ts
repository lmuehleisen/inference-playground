import { createSubscriber } from "svelte/reactivity";

const subscribe = createSubscriber(update => {
	const mutationObserver = new MutationObserver(entries => {
		for (const entry of entries) {
			if (entry.type === "attributes" && entry.attributeName === "class") {
				update();
			}
		}
	});
	mutationObserver.observe(document.body, { attributes: true });

	return () => {
		mutationObserver.disconnect();
	};
});

export function isDark() {
	subscribe();
	return document.body.classList.contains("dark");
}
