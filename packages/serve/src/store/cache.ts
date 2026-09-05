import type { OutputStore } from "./index.js";

export interface CacheStoreOptions {
	/** Which named cache to open. Default `"stillmap"`. */
	readonly name?: string;
	/**
	 * The origin cache entries are keyed under. Never fetched; the Cache API
	 * only requires that keys be absolute URLs.
	 */
	readonly origin?: string;
	/** Injectable for tests. Defaults to `globalThis.caches`. */
	readonly caches?: CacheStorage | undefined;
}

const CONTENT_TYPES: Readonly<Record<string, string>> = {
	png: "image/png",
	svg: "image/svg+xml",
};

/**
 * Rendered maps in the Web Cache API.
 *
 * Worth knowing before reaching for this: PNG output needs `@resvg/resvg-js`,
 * which is a native addon and cannot load in an edge isolate, and edge isolates
 * are most of what provides `caches`. The combinations that do work are Deno
 * Deploy, SVG-only rendering on a worker runtime, and any environment running a
 * Cache API shim over Redis or S3. On Vercel's Node runtime or a plain Lambda
 * there is no `caches` global and `fileStore` or your own adapter is the answer.
 *
 * The absence is reported here, at construction, rather than as a cache miss on
 * every request for the life of the process.
 */
export function cacheStore(options: CacheStoreOptions = {}): OutputStore {
	/*
	 * `caches` is declared as always present by the DOM lib, and is absent on
	 * Node. Reading it through a widened type is what makes the check honest.
	 */
	const ambient = (globalThis as { caches?: CacheStorage }).caches;
	const storage = options.caches ?? ambient;

	if (storage === undefined) {
		throw new Error(
			"cacheStore() needs a Cache API. This runtime has no `caches` global; " +
				"use fileStore() on Node, or pass `caches` explicitly.",
		);
	}

	const name = options.name ?? "stillmap";
	const origin = options.origin ?? "https://stillmap.invalid";
	const urlFor = (key: string): string => new URL(key, `${origin}/`).toString();

	let opened: Promise<Cache> | null = null;

	const open = (): Promise<Cache> => {
		opened ??= storage.open(name);

		return opened;
	};

	return {
		get: async (key) => {
			const hit = await (await open()).match(urlFor(key));

			if (hit === undefined) {
				return null;
			}

			return new Uint8Array(await hit.arrayBuffer());
		},
		set: async (key, value) => {
			const extension = key.slice(key.lastIndexOf(".") + 1);

			await (
				await open()
			).put(
				urlFor(key),
				new Response(value, {
					headers: {
						"Content-Type":
							CONTENT_TYPES[extension] ?? "application/octet-stream",
						/*
						 * Cloudflare refuses to store a response with no freshness
						 * information. The URL is already content-addressed, so a long
						 * life is exactly right.
						 */
						"Cache-Control": "public, max-age=31536000, immutable",
					},
				}),
			);
		},
	};
}
