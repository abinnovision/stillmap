import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import { PreviewError } from "./errors.js";

/** One previewable file found under the templates root. */
export interface Template {
	/**
	 * Path relative to the root without its extension, always `/` separated.
	 * Stable across restarts, so a preview URL survives one.
	 */
	readonly id: string;
	readonly file: string;
}

const TEMPLATE_FILE = /(?<!\.(?:spec|test))\.[jt]sx$/;
const SKIPPED_DIRECTORIES = new Set([
	"node_modules",
	"dist",
	"coverage",
	"out",
]);

function isTemplateFile(name: string): boolean {
	return !name.startsWith(".") && TEMPLATE_FILE.test(name);
}

function isSkippedDirectory(name: string): boolean {
	return name.startsWith(".") || SKIPPED_DIRECTORIES.has(name);
}

function idFor(root: string, file: string): string {
	return relative(root, file)
		.split(sep)
		.join("/")
		.replace(/\.[jt]sx$/, "");
}

async function collect(root: string, dir: string): Promise<Template[]> {
	const entries = await readdir(dir, { withFileTypes: true });

	const nested = await Promise.all(
		entries
			.filter((entry) => entry.isDirectory() && !isSkippedDirectory(entry.name))
			.map(async (entry) => await collect(root, join(dir, entry.name))),
	);

	const here = entries
		.filter((entry) => entry.isFile() && isTemplateFile(entry.name))
		.map((entry) => {
			const file = join(dir, entry.name);

			return { id: idFor(root, file), file };
		});

	return [...here, ...nested.flat()];
}

/**
 * Finds every template under `root`, depth first, sorted by id so the sidebar
 * order does not depend on filesystem enumeration order.
 */
export async function discover(root: string): Promise<readonly Template[]> {
	try {
		const found = await collect(root, root);

		return found.sort((a, b) => a.id.localeCompare(b.id));
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			throw new PreviewError(
				"TEMPLATES_DIRECTORY_MISSING",
				`No such directory: ${root}`,
				"Create it, or pass the directory holding your map templates.",
			);
		}

		throw error;
	}
}
