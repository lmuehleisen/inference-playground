import { svelteTesting } from "@testing-library/svelte/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import UnpluginTypia from "@ryoppippi/unplugin-typia/vite";
import Icons from "unplugin-icons/vite";

export const isDev = process.env.NODE_ENV === "development";

export default defineConfig({
	plugins: [
		UnpluginTypia({ log: "verbose", cache: false }),
		sveltekit(),
		Icons({ compiler: "svelte", autoInstall: true }),
	],
	server: { allowedHosts: isDev ? true : undefined },
	test: {
		workspace: [
			{
				extends: "./vite.config.ts",
				plugins: [svelteTesting()],
				test: {
					name: "client",
					environment: "browser",
					browser: {
						enabled: true,
						provider: "playwright",
						instances: [
							{
								browser: "chromium",
							},
							{
								browser: "firefox",
							},
						],
					},
					clearMocks: true,
					include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
					exclude: ["src/lib/server/**"],
					setupFiles: ["./vitest-setup-client.ts"],
				},
			},
			{
				extends: "./vite.config.ts",
				test: {
					name: "server",
					environment: "node",
					include: ["src/**/*.{test,spec}.{js,ts}"],
					exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
				},
			},
		],
	},
});
