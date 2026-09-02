import { mkdir, rename, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Node types a `Buffer` as `Uint8Array<ArrayBufferLike>`, which is not assignable
 * to `BodyInit`. Narrowing once here keeps every later hand-off trivial.
 */
export type PngBytes = Uint8Array<ArrayBuffer>;

/**
 * Where rendered maps live between requests. Deliberately an interface: the
 * filesystem implementation below is right for a long-lived server or a
 * container and wrong for serverless, where the disk is ephemeral and
 * per-instance. Swapping in Redis, S3 or a blob store changes nothing else.
 */
export interface MapStore {
	readonly get: (key: string) => Promise<PngBytes | null>;
	readonly set: (key: string, value: PngBytes) => Promise<void>;
}

export function fileMapStore(dir: string): MapStore {
	const pathFor = (key: string): string => join(dir, `${key}.png`);

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
			 * Write then rename, so a concurrent reader never sees a partial PNG.
			 * Two writers producing identical bytes is fine; the rename is atomic.
			 */
			const temporary = `${pathFor(key)}.${String(process.pid)}.tmp`;

			await writeFile(temporary, value);
			await rename(temporary, pathFor(key));
		},
	};
}

/** Renders every time. Useful for measuring what the cache is worth. */
export function nullMapStore(): MapStore {
	return {
		get: () => Promise.resolve(null),
		set: () => Promise.resolve(),
	};
}
