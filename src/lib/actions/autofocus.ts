import { tick } from "svelte";

export function autofocus(node: HTMLElement) {
	tick().then(() => {
		node.focus();
	});
}
