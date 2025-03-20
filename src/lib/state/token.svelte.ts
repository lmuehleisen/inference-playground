import { safeParse } from "$lib/utils/json.js";
import typia from "typia";

const key = "hf_token";

class Token {
	#value = $state("");
	writeToLocalStorage = $state(true);
	showModal = $state(false);

	constructor() {
		const storedHfToken = localStorage.getItem(key);
		const parsed = safeParse(storedHfToken ?? "");
		this.value = typia.is<string>(parsed) ? parsed : "";
	}

	get value() {
		return this.#value;
	}

	set value(token: string) {
		if (this.writeToLocalStorage) {
			localStorage.setItem(key, JSON.stringify(token));
		}
		this.#value = token;
		this.showModal = !token.length;
	}

	reset = () => {
		this.value = "";
		localStorage.removeItem(key);
	};
}

export const token = new Token();
