import { Toaster } from "melt/builders";

export type ToastData = {
	title: string;
	description: string;
	variant: "success" | "warning" | "error";
};

export const toaster = new Toaster<ToastData>({
	hover: "pause-all",
	closeDelay: 0,
});

export function addToast(data: ToastData) {
	toaster.addToast({ data });
}

export function removeToast(id: string) {
	toaster.removeToast(id);
}

addToast({
	title: "Hello World 1",
	description: "hey",
	variant: "success",
});

addToast({
	title: "Hello World 2",
	description: "hey",
	variant: "success",
});

addToast({
	title: "Hello World 3",
	description: "hi",
	variant: "success",
});
