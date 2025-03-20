import fs from "fs";
import path from "path";

export default {
	meta: {
		type: "suggestion",
		docs: {
			description: "Enforce file extensions in import statements",
		},
		fixable: "code",
		schema: [
			{
				type: "object",
				properties: {
					ignorePaths: {
						type: "array",
						items: { type: "string" },
					},
					includePaths: {
						type: "array",
						items: { type: "string" },
						description: "Path patterns to include (e.g., '$lib/')",
					},
					tsToJs: {
						type: "boolean",
						description: "Convert .ts files to .js when importing",
					},
					aliases: {
						type: "object",
						description: "Map of path aliases to their actual paths (e.g., {'$lib': 'src/lib'})",
					},
				},
				additionalProperties: false,
			},
		],
		messages: {
			missingExtension: "Import should include a file extension",
			noFileFound: "Import is missing extension and no matching file was found",
		},
	},
	create(context) {
		const options = context.options[0] || {};
		const ignorePaths = options.ignorePaths || [];
		const includePaths = options.includePaths || [];
		const tsToJs = options.tsToJs !== undefined ? options.tsToJs : true; // Default to true
		const aliases = options.aliases || {};

		// Get the project root directory
		const projectRoot = process.cwd();

		// Utility function to resolve file paths
		function resolveImportPath(importPath, currentFilePath) {
			// Handle relative paths
			if (importPath.startsWith("./") || importPath.startsWith("../")) {
				return path.resolve(path.dirname(currentFilePath), importPath);
			}

			// Handle aliased paths
			for (const [alias, aliasPath] of Object.entries(aliases)) {
				// Check if the import starts with this alias
				if (importPath === alias || importPath.startsWith(`${alias}/`)) {
					// Replace the alias with the actual path
					const relativePath = importPath === alias ? "" : importPath.slice(alias.length + 1); // +1 for the slash

					// Convert the aliasPath to an absolute path
					let absoluteAliasPath = aliasPath;
					if (!path.isAbsolute(absoluteAliasPath)) {
						absoluteAliasPath = path.resolve(projectRoot, aliasPath);
					}

					return path.join(absoluteAliasPath, relativePath);
				}
			}

			return null;
		}

		// Find the file extension by checking which file exists
		function findActualFile(basePath) {
			if (!basePath) return null;

			try {
				// Get the directory and base name
				const dir = path.dirname(basePath);
				const base = path.basename(basePath);

				// If the directory doesn't exist, return early
				if (!fs.existsSync(dir)) {
					return null;
				}

				// Read all files in the directory
				const files = fs.readdirSync(dir);

				// Look for files that match our base name plus any extension
				for (const file of files) {
					const fileParts = path.parse(file);

					// If we find a file that matches our base name
					if (fileParts.name === base) {
						// Handle TypeScript to JavaScript conversion
						if (tsToJs && fileParts.ext === ".ts") {
							return {
								actualPath: path.join(dir, file),
								importExt: ".js", // Import as .js even though it's a .ts file
							};
						}

						// Otherwise use the actual extension
						return {
							actualPath: path.join(dir, file),
							importExt: fileParts.ext,
						};
					}
				}
			} catch (error) {
				// If there's an error checking file existence, return null
				console.error("Error checking files:", error);
			}

			return null;
		}

		return {
			ImportDeclaration(node) {
				const source = node.source.value;

				// Check if it's a relative import or matches a manually specified include path
				const isRelativeImport = source.startsWith("./") || source.startsWith("../");
				const isAliasedPath = Object.keys(aliases).some(alias => source === alias || source.startsWith(`${alias}/`));
				const isIncludedPath = includePaths.some(pattern => source.startsWith(pattern));

				// Skip if it's not a relative import, aliased path, or included path
				if (!isRelativeImport && !isAliasedPath && !isIncludedPath) {
					return;
				}

				// Skip ignored paths
				if (ignorePaths.some(path => source.includes(path))) {
					return;
				}

				// Check if the import already has an extension
				const hasExtension = path.extname(source) !== "";
				if (!hasExtension) {
					// Get current file path to resolve the import
					const currentFilePath = context.getFilename();

					// Try to determine the correct file by checking what exists
					const resolvedPath = resolveImportPath(source, currentFilePath);
					const fileInfo = findActualFile(resolvedPath);

					context.report({
						node,
						messageId: fileInfo ? "missingExtension" : "noFileFound",
						fix(fixer) {
							// Only provide a fix if we found a file
							if (fileInfo) {
								// Replace the string literal with one that includes the extension
								return fixer.replaceText(node.source, `"${source}${fileInfo.importExt}"`);
							}

							// Otherwise, don't try to fix
							return null;
						},
					});
				}
			},
		};
	},
};
