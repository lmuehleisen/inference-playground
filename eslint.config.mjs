import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import parser from "svelte-eslint-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import enforceExt from "./eslint-rules/enforce-extensions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

export default [
	{
		ignores: [
			"**/*.cjs",
			"**/.DS_Store",
			"**/node_modules",
			"build",
			".svelte-kit",
			"package",
			"**/.env",
			"**/.env.*",
			"!**/.env.example",
			"**/pnpm-lock.yaml",
			"**/package-lock.json",
			"**/yarn.lock",
		],
	},
	...compat.extends(
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:svelte/recommended",
		"prettier"
	),
	{
		plugins: {
			"@typescript-eslint": typescriptEslint,
			"local": {
				rules: {
					"enforce-ext": enforceExt,
				},
			},
		},

		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},

			parser: tsParser,
			ecmaVersion: 2020,
			sourceType: "module",

			parserOptions: {
				extraFileExtensions: [".svelte"],
			},
		},

		rules: {
			"require-yield": "off",
			"@typescript-eslint/no-explicit-any": "error",
			// "@typescript-eslint/no-non-null-assertion": "error",

			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
				},
			],

			"object-shorthand": ["error", "always"],
			"svelte/no-at-html-tags": "off",
			"local/enforce-ext": [
				"error",
				{
					includePaths: ["$lib/"],
					aliases: {
						$lib: "src/lib",
					},
				},
			],
		},
	},
	{
		files: ["**/*.svelte"],

		languageOptions: {
			parser,
			ecmaVersion: 5,
			sourceType: "script",

			parserOptions: {
				parser: "@typescript-eslint/parser",
			},
		},
	},
];
