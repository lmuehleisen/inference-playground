import type { Config } from "tailwindcss";
import containerQueries from "@tailwindcss/container-queries";

export default {
	content: ["./src/**/*.{html,js,svelte,ts}"],
	darkMode: 'selector',
	theme: {
		extend: {},
	},

	plugins: [containerQueries],
} as Config;
