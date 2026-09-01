import { readFile } from "node:fs/promises";
import { dirname, sep } from "node:path";
import { pathToFileURL } from "node:url";

import type { Loader, Plugin } from "esbuild";

const BARE = /^[^./]/;
const SOURCE = /\.[cm]?[jt]sx?$/;
const RESOLVING = Symbol("resolving");

const LOADERS: Readonly<Record<string, Loader>> = {
	cjs: "js",
	cts: "ts",
	js: "jsx",
	jsx: "jsx",
	mjs: "jsx",
	mts: "ts",
	ts: "ts",
	tsx: "tsx",
};

function isInstalled(path: string): boolean {
	return path.split(sep).includes("node_modules");
}

function loaderFor(path: string): Loader {
	return LOADERS[path.split(".").pop() ?? ""] ?? "jsx";
}

/**
 * Rewrites `import.meta` to the module's real location.
 *
 * Bundling would otherwise point it at the bundle, and this library takes fonts
 * and other assets as file paths, which templates naturally derive from
 * `import.meta.url`.
 */
async function keepModuleLocation(
	path: string,
): Promise<{ contents: string; loader: Loader } | null> {
	const source = await readFile(path, "utf8");

	if (!source.includes("import.meta")) {
		return null;
	}

	return {
		contents: source
			.replaceAll(
				/\bimport\.meta\.url\b/g,
				JSON.stringify(pathToFileURL(path).href),
			)
			.replaceAll(/\bimport\.meta\.filename\b/g, JSON.stringify(path))
			.replaceAll(/\bimport\.meta\.dirname\b/g, JSON.stringify(dirname(path))),
		loader: loaderFor(path),
	};
}

/**
 * Prepares a template for a plain Node import.
 *
 * Installed dependencies are left external, as absolute file URLs rather than
 * bare specifiers, so the running process's own export conditions cannot change
 * which copy a template ends up with. Code outside `node_modules` is bundled:
 * in a workspace that is the linked source of the library itself, which must be
 * resolved the way a published install would resolve it.
 */
export function previewPlugin(): Plugin {
	return {
		name: "stillmap-preview",
		setup: (build) => {
			build.onResolve({ filter: BARE }, async (args) => {
				if (args.pluginData === RESOLVING || args.path.startsWith("node:")) {
					return null;
				}

				const resolved = await build.resolve(args.path, {
					kind: args.kind,
					importer: args.importer,
					resolveDir: args.resolveDir,
					pluginData: RESOLVING,
				});

				if (
					resolved.errors.length > 0 ||
					resolved.external ||
					!isInstalled(resolved.path)
				) {
					return null;
				}

				return { path: pathToFileURL(resolved.path).href, external: true };
			});

			build.onLoad(
				{ filter: SOURCE },
				async (args) => await keepModuleLocation(args.path),
			);
		},
	};
}
