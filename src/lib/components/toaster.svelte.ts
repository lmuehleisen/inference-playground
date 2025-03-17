import { Toaster } from "melt/builders";

export type ToastData = {
	title: string;
	description: string;
	variant: "success" | "warning" | "error";
};

export const toaster = new Toaster<ToastData>({
	hover: "pause-all",
});

export function addToast(data: ToastData) {
	toaster.addToast({ data });
}

export function removeToast(id: string) {
	toaster.removeToast(id);
}
