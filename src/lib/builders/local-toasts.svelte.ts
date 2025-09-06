import { extract } from "$lib/spells/extract.svelte";
import { autoUpdate, computePosition, flip, type Placement } from "@floating-ui/dom";
import type { MaybeGetter } from "melt";
import { Toaster, type ToasterProps } from "melt/builders";
import { createAttachmentKey } from "svelte/attachments";
import type { HTMLAttributes, HTMLButtonAttributes } from "svelte/elements";

type ToastData = {
	content: string;
	variant: "info" | "danger";
};

const classMap: Record<ToastData["variant"], string> = {
	info: "border border-blue-400 bg-gradient-to-b from-blue-500 to-blue-600",

	danger: "border border-red-400 bg-gradient-to-b from-red-500 to-red-600",
};

type LocalToastsProps = ToasterProps & {
	placement?: MaybeGetter<Placement>;
};

export class LocalToasts {
	placement: Placement;

	#triggerEl: HTMLButtonElement | null = null;
	toaster: Toaster<ToastData>;

	constructor(props: LocalToastsProps = {}) {
		this.toaster = new Toaster<ToastData>(props);
		this.placement = $derived(extract(props.placement, "top"));
	}

	get addToast() {
		return this.toaster.addToast;
	}

	#triggerAttachment = {
		[createAttachmentKey()]: (node: HTMLButtonElement) => {
			this.#triggerEl = node;
			return () => {
				this.#triggerEl = null;
			};
		},
	};

	get trigger() {
		return {
			"data-local-toast-trigger": "",
			...this.#triggerAttachment,
		} as const satisfies HTMLButtonAttributes;
	}

	get toasts() {
		const original = this.toaster?.toasts;

		return original.map(toast => {
			const attrs = {
				"data-local-toast": "",
				"data-variant": toast.data.variant,
				[createAttachmentKey()]: node => {
					let placement: Placement = $state(this.placement);

					const triggerEl = this.#triggerEl;
					if (!triggerEl) return;

					const compute = () =>
						computePosition(triggerEl, node, {
							strategy: "absolute",
							placement: this.placement,
							middleware: [flip()],
						}).then(({ x, y, placement: _placement }) => {
							placement = _placement;
							Object.assign(node.style, {
								left: placement === "top" ? `${x}px` : `${x - 4}px`,
								top: placement === "top" ? `${y - 6}px` : `${y}px`,
							});

							// Animate
							// Cancel any ongoing animations
							node.getAnimations().forEach(anim => anim.cancel());

							// Determine animation direction based on placement
							let keyframes: Keyframe[] = [];
							switch (placement) {
								case "top":
									keyframes = [
										{ opacity: 0, transform: "translateY(8px)", scale: "0.8" },
										{ opacity: 1, transform: "translateY(0)", scale: "1" },
									];
									break;
								case "left":
									keyframes = [
										{ opacity: 0, transform: "translateX(8px)", scale: "0.8" },
										{ opacity: 1, transform: "translateX(0)", scale: "1" },
									];
									break;
							}

							node.animate(keyframes, {
								duration: 500,
								easing: "cubic-bezier(0.22, 1, 0.36, 1)",
								fill: "forwards",
							});
						});

					const reference = node.cloneNode(true) as HTMLElement;
					node.before(reference);
					reference.style.visibility = "hidden";

					const destroyers = [
						autoUpdate(triggerEl, node, compute),
						async () => {
							// clone node
							const cloned = node.cloneNode(true) as HTMLElement;
							reference.before(cloned);
							reference.remove();
							cloned.getAnimations().forEach(anim => anim.cancel());

							// Animate out
							// Cancel any ongoing animations
							cloned.getAnimations().forEach(anim => anim.cancel());

							// Determine animation direction based on placement
							let keyframes: Keyframe[] = [];
							switch (placement) {
								case "top":
									keyframes = [
										{ opacity: 1, transform: "translateY(0)" },
										{ opacity: 0, transform: "translateY(-8px)" },
									];
									break;
								case "left":
									keyframes = [
										{ opacity: 1, transform: "translateX(0)" },
										{ opacity: 0, transform: "translateX(-8px)" },
									];
									break;
							}

							await cloned.animate(keyframes, {
								duration: 400,
								easing: "cubic-bezier(0.22, 1, 0.36, 1)",
								fill: "forwards",
							}).finished;

							cloned.remove();
						},
					];

					return () => destroyers.forEach(d => d());
				},
				"style": `
		/* Float on top of the UI */
		position: absolute;
		z-index: 100;

		/* Avoid layout interference */
		width: max-content;
		top: 0;
		left: 0;
`,
			} as const satisfies HTMLAttributes<HTMLElement>;

			return Object.assign(toast, {
				class: `${classMap[toast.data.variant]} rounded-full px-2 py-1 text-xs`,
				attrs,
			});
		});
	}
}
