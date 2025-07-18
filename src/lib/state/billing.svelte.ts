import { PersistedState } from "runed";

const STORAGE_KEY = "hf_billing_org";

class Billing {
	#organization = new PersistedState(STORAGE_KEY, "");

	get organization() {
		return this.#organization.current;
	}

	set organization(org: string) {
		this.#organization.current = org;
	}

	reset = () => {
		this.organization = "";
		localStorage.removeItem(STORAGE_KEY);
	};
}

export const billing = new Billing();
