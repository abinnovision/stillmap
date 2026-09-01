import { build } from "esbuild";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { PreviewError } from "./errors.js";
import { previewPlugin } from "./plugin.js";

import type { BuildFailure } from "esbuild";

/**
 * Where bundled templates land.
 *
 * Inside the project rather than in a temp directory, because bare imports are
 * left external and Node resolves them from the bundle's own location. The
 * nearest `node_modules` ancestor is therefore both the right anchor and proof
 * that the project has dependencies to import.
 */
export function cacheDirectory(from: string): string {
	let directory = resolve(from);

	for (;;) {
		if (existsSync(join(directory, "node_modules"))) {
			return join(directory, "node_modules", ".cache", "stillmap");
		}

		const parent = dirname(directory);

		if (parent === directory) {
			throw new PreviewError(
				"DEPENDENCIES_NOT_INSTALLED",
				`No node_modules directory above ${from}.`,
				"Install the project's dependencies before starting the preview.",
			);
		}

		directory = parent;
	}
}

let generation = 0;

function toBuildFailure(error: unknown, file: string): PreviewError {
	const errors = (error as Partial<BuildFailure>).errors ?? [];
	const first = errors[0];
	const where =
		first?.location === undefined || first.location === null
			? file
			: `${first.location.file}:${String(first.location.line)}:${String(first.location.column)}`;

	return new PreviewError(
		"TEMPLATE_BUILD_FAILED",
		first === undefined ? `Could not build ${file}.` : first.text,
		where,
	);
}

/**
 * Bundles one template and returns a specifier for it.
 *
 * esbuild rather than the project's own toolchain, because the JSX runtime has
 * to be pinned: a project targeting a bundler may set `jsx` to `preserve`, or
 * leave the templates outside its tsconfig's `include`, and either leaves Node
 * unable to run the result.
 *
 * Bundling also means a save to a module the template imports is picked up,
 * since that module is inlined rather than resolved through the module cache.
 * The counter busts the cache for the entry, which is all that is left.
 */
export async function bundleTemplate(
	file: string,
	cache: string,
): Promise<string> {
	const name = createHash("sha256").update(file).digest("hex").slice(0, 16);
	const outfile = join(cache, `${name}.mjs`);

	await mkdir(cache, { recursive: true });

	try {
		await build({
			entryPoints: [file],
			outfile,
			bundle: true,
			// The plugin externalises bare imports, so react stays a single copy.
			plugins: [previewPlugin()],
			conditions: ["node", "import"],
			format: "esm",
			platform: "node",
			target: "node22",
			jsx: "automatic",
			jsxImportSource: "react",
			sourcemap: "inline",
			logLevel: "silent",
		});
	} catch (error) {
		throw toBuildFailure(error, file);
	}

	generation += 1;

	return `${pathToFileURL(outfile).href}?v=${String(generation)}`;
}
