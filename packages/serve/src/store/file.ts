import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { OutputStore } from "./index.js";

/** Rendered maps as files. For a long-lived server or a container. */
export function fileStore(dir: string): OutputStore {
	const pathFor = (key: string): string => join(dir, key);

	return {
		get: async (key) => {
			try {
				return new Uint8Array(await readFile(pathFor(key)));
			} catch {
				return null;
			}
		},
		set: async (key, value) => {
			await mkdir(dir, { recursive: true });

			/*
			 * Write then rename, so a concurrent reader never sees a partial
			 * image. Two writers producing identical bytes is fine; the rename is
			 * atomic.
			 */
			const temporary = `${pathFor(key)}.${String(process.pid)}.tmp`;

			await writeFile(temporary, value);
			await rename(temporary, pathFor(key));
		},
	};
}
