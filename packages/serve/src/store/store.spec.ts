import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cacheStore } from "./cache.js";
import { fileStore } from "./file.js";
import { nullStore } from "./null.js";

const BYTES = new Uint8Array([137, 80, 78, 71]);

describe("fileStore", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "stillmap-serve-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it("round-trips bytes under the key", async () => {
		const store = fileStore(dir);

		await store.set("abc.png", BYTES);

		expect(await store.get("abc.png")).toEqual(BYTES);
	});

	it("reports a miss rather than throwing", async () => {
		expect(await fileStore(dir).get("missing.png")).toBeNull();
	});

	it("leaves no temporary file behind", async () => {
		const store = fileStore(dir);

		await store.set("abc.png", BYTES);

		expect(await readdir(dir)).toEqual(["abc.png"]);
	});
});

describe("nullStore", () => {
	it("never returns what it was given", async () => {
		const store = nullStore();

		await store.set("abc.png", BYTES);

		expect(await store.get("abc.png")).toBeNull();
	});
});

describe("cacheStore", () => {
	function stubCaches(): CacheStorage {
		const entries = new Map<string, Response>();

		/* The store only ever passes URL strings, so the stub only accepts them. */
		const cache = {
			match: (request: string) =>
				Promise.resolve(entries.get(request)?.clone()),
			put: (request: string, response: Response) => {
				entries.set(request, response);

				return Promise.resolve();
			},
		} as unknown as Cache;

		return { open: () => Promise.resolve(cache) } as unknown as CacheStorage;
	}

	it("round-trips bytes", async () => {
		const store = cacheStore({ caches: stubCaches() });

		await store.set("abc.png", BYTES);

		expect(await store.get("abc.png")).toEqual(BYTES);
	});

	it("reports a miss as null", async () => {
		expect(
			await cacheStore({ caches: stubCaches() }).get("nope.png"),
		).toBeNull();
	});

	it("infers a content type from the key's extension", async () => {
		const caches = stubCaches();
		const store = cacheStore({ caches });

		await store.set("abc.svg", BYTES);

		const cache = await caches.open("stillmap");
		const hit = await cache.match("https://stillmap.invalid/abc.svg");

		expect(hit?.headers.get("Content-Type")).toBe("image/svg+xml");
	});

	it("refuses to construct where there is no Cache API", () => {
		expect(() => cacheStore({ caches: undefined })).toThrow(
			/no `caches` global/,
		);
	});
});
