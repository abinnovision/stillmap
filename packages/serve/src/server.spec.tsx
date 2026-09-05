import { defineTileSource } from "@stillmap/core";
import { Font, Map, Water } from "@stillmap/react";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";

import { createMapServer, EPOCH_PARAM, SIGNATURE_PARAM } from "./index.js";
import {
	defineTemplate,
	notFound,
	readNumber,
	readString,
} from "./template.js";
import { createFixtureSource } from "../test/support/fixture-source.js";

import type { Bytes, OutputStore } from "./store/index.js";
import type { LngLat } from "@stillmap/core";

/* The committed tiles are z13 Hamburg only; anywhere else renders empty. */
const HAMBURG: LngLat = [9.9937, 53.5511];

const INTER = fileURLToPath(
	new URL("../test/fixtures/Inter-subset.ttf", import.meta.url),
);

const SECRET = "test-secret";
const source = createFixtureSource();
const fonts = [{ family: "Fixture", file: INTER }];

/** Bumped by a test to make an already-minted URL stale. */
let dataVersion = "v1";
/** Emptied by a test to make an already-minted URL point at nothing. */
let knownIds = new Set(["42", "observed", "concurrent"]);
let renders = 0;

const storeMap = defineTemplate({
	format: "svg",

	version: (query) => {
		/* The lookup lives here, so a bad id is rejected before any work. */
		if (!knownIds.has(readString(query, "id"))) {
			throw notFound("Unknown store");
		}

		return dataVersion;
	},

	render: (context) => {
		renders += 1;

		return (
			<Map
				source={context.source}
				center={HAMBURG}
				zoom={13}
				width={readNumber(context.query, "w")}
				height={readNumber(context.query, "h")}
			>
				{context.fonts.map((font) => (
					<Font key={font.family} {...font} />
				))}
				<Water fill="#CCDDEE" />
			</Map>
		);
	},
});

/* A plain object, because `Map` is the stillmap component in this file. */
const written = new WeakMap<OutputStore, string[]>();

function memoryStore(): OutputStore {
	const entries: Record<string, Bytes | undefined> = {};
	const store: OutputStore = {
		get: (key) => Promise.resolve(entries[key] ?? null),
		set: (key, value) => {
			entries[key] = value;
			written.get(store)?.push(key);

			return Promise.resolve();
		},
	};

	written.set(store, []);

	return store;
}

const stored = (store: OutputStore): string[] => written.get(store) ?? [];

interface ServerOverrides {
	readonly store?: OutputStore;
	readonly onRender?: (info: { key: string; durationMs: number }) => void;
}

function createServer(overrides: ServerOverrides = {}) {
	return createMapServer({
		source,
		fonts,
		basePath: "/api/map",
		epoch: "7",
		signing: { secret: SECRET },
		templates: { store: storeMap },
		...overrides,
	});
}

const CARD = { id: "42", w: 600, h: 300 };

const get = (url: string, headers: HeadersInit = {}): Request =>
	new Request(new URL(url, "https://example.test"), { headers });

const search = (url: string): URLSearchParams =>
	new URL(url, "https://example.test").searchParams;

beforeEach(() => {
	dataVersion = "v1";
	knownIds = new Set(["42", "observed", "concurrent"]);
	renders = 0;
});

describe("url", () => {
	it("names the template, carries the parameters, and signs", async () => {
		const query = search(await createServer().url("store", CARD));

		expect(query.get("t")).toBe("store");
		expect(query.get("id")).toBe("42");
		expect(query.get("w")).toBe("600");
		expect(query.get("v")).toBe("v1");
		expect(query.get(SIGNATURE_PARAM)).toMatch(/^[A-Za-z0-9_-]{22}$/);
	});

	it("is stable, so one map is never two cache entries", async () => {
		const maps = createServer();

		expect(await maps.url("store", { id: "42", w: 600, h: 300 })).toBe(
			await maps.url("store", { h: 300, w: 600, id: "42" }),
		);
	});

	it("can be made absolute", async () => {
		const url = await createServer().url("store", CARD, {
			base: "https://example.test/stores",
		});

		expect(url.startsWith("https://example.test/api/map?")).toBe(true);
	});

	it("refuses an unknown template", async () => {
		await expect(createServer().url("nope" as "store")).rejects.toThrow(
			/Unknown map template/,
		);
	});

	/*
	 * Signing moves this failure forward in time. A URL for something that does
	 * not exist cannot be signed, so it cannot be minted either.
	 */
	it("refuses to mint a URL for something that does not exist", async () => {
		await expect(
			createServer().url("store", { ...CARD, id: "missing" }),
		).rejects.toThrow("Unknown store");
	});
});

describe("fetch", () => {
	it("renders a map with validators attached", async () => {
		const maps = createServer();
		const response = await maps.fetch(get(await maps.url("store", CARD)));

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
		expect(response.headers.get("Cache-Control")).toContain("immutable");
		expect(response.headers.get("ETag")).toMatch(/^"[0-9a-f]{32}"$/);
		expect(await response.text()).toContain("<svg");
		expect(renders).toBe(1);
	});

	it("takes its dimensions from the query", async () => {
		const maps = createServer();
		const response = await maps.fetch(
			get(await maps.url("store", { id: "42", w: 1200, h: 600 })),
		);

		expect(await response.text()).toContain('width="1200"');
	});

	it("answers a conditional request without rendering", async () => {
		const maps = createServer();
		const url = await maps.url("store", CARD);
		const etag = (await maps.fetch(get(url))).headers.get("ETag") ?? "";

		renders = 0;

		const response = await maps.fetch(get(url, { "If-None-Match": etag }));

		expect(response.status).toBe(304);
		expect(renders).toBe(0);
	});

	it("serves a second request from the store", async () => {
		const maps = createServer({ store: memoryStore() });
		const url = await maps.url("store", CARD);

		await maps.fetch(get(url));
		const response = await maps.fetch(get(url));

		expect(response.status).toBe(200);
		expect(renders).toBe(1);
	});

	it("reports a render, so a hit is distinguishable from a miss", async () => {
		const reported: { key: string; durationMs: number }[] = [];
		const maps = createServer({
			store: memoryStore(),
			onRender: (info) => reported.push(info),
		});
		const url = await maps.url("store", { ...CARD, id: "observed" });

		await maps.fetch(get(url));
		await maps.fetch(get(url));

		expect(reported).toHaveLength(1);
		expect(reported[0]?.key).toMatch(/^[0-9a-f]{32}$/);
	});

	it("collapses concurrent cold requests into one render", async () => {
		const maps = createServer({ store: memoryStore() });
		const url = await maps.url("store", { ...CARD, id: "concurrent" });

		const responses = await Promise.all(
			Array.from({ length: 8 }, async () => await maps.fetch(get(url))),
		);

		expect(responses.every((response) => response.status === 200)).toBe(true);
		expect(renders).toBe(1);
	});

	it("redirects a stale version instead of serving current pixels", async () => {
		const maps = createServer();
		const stale = await maps.url("store", CARD);

		dataVersion = "v2";

		const response = await maps.fetch(get(stale));
		const location = search(response.headers.get("Location") ?? "");

		expect(response.status).toBe(308);
		expect(location.get("v")).toBe("v2");
		expect(location.get("id")).toBe("42");
		expect(renders).toBe(0);
	});

	it("re-signs the URL it redirects to", async () => {
		const maps = createServer();
		const stale = await maps.url("store", CARD);

		dataVersion = "v2";

		const location =
			(await maps.fetch(get(stale))).headers.get("Location") ?? "";

		expect((await maps.fetch(get(location))).status).toBe(200);
	});

	/*
	 * Unsigned callers get a 403 before the lookup, so they cannot tell a real
	 * template name from an invented one. The 404 is reachable only with a valid
	 * signature, which means a URL minted before the template was removed.
	 */
	it("rejects an unsigned probe before revealing whether a template exists", async () => {
		const maps = createServer();
		const real = await maps.fetch(get("/api/map?t=store&sig=x"));
		const fake = await maps.fetch(get("/api/map?t=nope&sig=x"));

		expect([real.status, fake.status]).toEqual([403, 403]);
	});

	it("404s a signed URL whose template has since been removed", async () => {
		const before = createServer();
		const after = createMapServer({
			source,
			fonts,
			basePath: "/api/map",
			signing: { secret: SECRET },
			templates: { other: storeMap },
		});

		const response = await after.fetch(get(await before.url("store", CARD)));

		expect(response.status).toBe(404);
	});

	it("rejects an unsigned request", async () => {
		const maps = createServer();
		const url = new URL(await maps.url("store", CARD), "https://example.test");

		url.searchParams.delete(SIGNATURE_PARAM);

		const response = await maps.fetch(get(url.toString()));

		expect(response.status).toBe(403);
		expect(renders).toBe(0);
	});

	it("rejects a tampered parameter, which is what replaces validation", async () => {
		const maps = createServer();
		const url = new URL(await maps.url("store", CARD), "https://example.test");

		url.searchParams.set("w", "8000");

		const response = await maps.fetch(get(url.toString()));

		expect(response.status).toBe(403);
		expect(renders).toBe(0);
	});

	/*
	 * The reachable 404: the URL was signed when the store existed and is now
	 * out in the wild, in a page or an email, pointing at something deleted.
	 */
	it("rejects a URL whose subject has since disappeared", async () => {
		const maps = createServer();
		const url = await maps.url("store", CARD);

		knownIds.delete("42");

		const response = await maps.fetch(get(url));

		expect(response.status).toBe(404);
		expect(await response.text()).toBe("Unknown store");
		expect(renders).toBe(0);
	});

	it("lets a template reject during a render", async () => {
		const maps = createMapServer({
			source,
			fonts,
			signing: { secret: SECRET },
			templates: {
				picky: defineTemplate({
					render: (context) => {
						throw notFound(`no such map: ${readString(context.query, "id")}`);
					},
				}),
			},
		});

		const response = await maps.fetch(
			get(await maps.url("picky", { id: "42" })),
		);

		expect(response.status).toBe(404);
		expect(await response.text()).toBe("no such map: 42");
	});

	it("rejects a method that is not a read", async () => {
		const response = await createServer().fetch(
			new Request("https://example.test/api/map?t=store", { method: "POST" }),
		);

		expect(response.status).toBe(405);
	});

	it("reports a render failure without leaking its message", async () => {
		const errors: unknown[] = [];
		const maps = createMapServer({
			source,
			fonts,
			signing: { secret: SECRET },
			onError: (error) => errors.push(error),
			templates: {
				broken: defineTemplate({
					render: () => {
						throw new Error("secret internal detail");
					},
				}),
			},
		});

		const response = await maps.fetch(get(await maps.url("broken")));

		expect(response.status).toBe(500);
		expect(await response.text()).not.toContain("secret internal detail");
		expect(errors).toHaveLength(1);
	});
});

/** Every tile fetch fails, exactly as a provider outage would. */
const brokenSource = defineTileSource({
	id: "broken",
	schema: source.schema,
	attribution: source.attribution,
	open: () =>
		Promise.resolve({
			minZoom: 0,
			maxZoom: 14,
			version: "broken",
			fetchTile: () => Promise.reject(new Error("network gone")),
		}),
});

describe("hardening", () => {
	it("carries the epoch in the URL, so bumping it can reach a CDN", async () => {
		const maps = createServer();

		expect(search(await maps.url("store", CARD)).get(EPOCH_PARAM)).toBe("7");
	});

	it("redirects a URL minted under an older epoch", async () => {
		const old = createServer();
		const url = await old.url("store", CARD);
		const bumped = createMapServer({
			source,
			fonts,
			basePath: "/api/map",
			epoch: "8",
			signing: { secret: SECRET },
			templates: { store: storeMap },
		});

		const response = await bumped.fetch(get(url));

		expect(response.status).toBe(308);
		expect(
			search(response.headers.get("Location") ?? "").get(EPOCH_PARAM),
		).toBe("8");
	});

	it("serves an incomplete map but never caches it", async () => {
		const store = memoryStore();
		const maps = createMapServer({
			source: brokenSource,
			fonts,
			basePath: "/api/map",
			epoch: "7",
			store,
			signing: { secret: SECRET },
			templates: { store: storeMap },
		});

		const response = await maps.fetch(get(await maps.url("store", CARD)));

		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(stored(store)).toEqual([]);
	});

	it("reports a degraded render", async () => {
		const seen: boolean[] = [];
		const maps = createMapServer({
			source: brokenSource,
			fonts,
			basePath: "/api/map",
			signing: { secret: SECRET },
			onRender: (info) => seen.push(info.degraded),
			templates: { store: storeMap },
		});

		await maps.fetch(get(await maps.url("store", CARD)));

		expect(seen).toEqual([true]);
	});

	it("hands `version` only the template's own parameters", async () => {
		const seen: string[][] = [];
		const maps = createMapServer({
			source,
			fonts,
			basePath: "/api/map",
			signing: { secret: SECRET },
			templates: {
				spy: defineTemplate({
					...storeMap,
					version: (query) => {
						seen.push([...query.keys()].sort());

						return "v1";
					},
				}),
			},
		});

		await maps.fetch(get(await maps.url("spy", CARD)));

		/* Once at mint, once on the way in, and identical both times. */
		expect(seen).toEqual([
			["h", "id", "w"],
			["h", "id", "w"],
		]);
	});

	/*
	 * The loop that used to ship: `version` derived from the whole query saw
	 * `v`, `e` and `sig` on the way in but not at mint time, so it returned a
	 * different answer and redirected to the URL it had just rejected.
	 */
	it("does not loop when `version` is derived from the whole query", async () => {
		const maps = createMapServer({
			source,
			fonts,
			basePath: "/api/map",
			signing: { secret: SECRET },
			templates: {
				derived: defineTemplate({
					...storeMap,
					version: (query) => [...query.keys()].sort().join("-"),
				}),
			},
		});

		const response = await maps.fetch(get(await maps.url("derived", CARD)));

		expect(response.status).toBe(200);
	});

	it("calls `version` once per request, not once per stage", async () => {
		let calls = 0;
		const maps = createMapServer({
			source,
			fonts,
			basePath: "/api/map",
			signing: { secret: SECRET },
			templates: {
				counted: defineTemplate({
					...storeMap,
					version: () => {
						calls += 1;

						return "v1";
					},
				}),
			},
		});

		const url = await maps.url("counted", CARD);

		calls = 0;
		await maps.fetch(get(url));

		expect(calls).toBe(1);
	});

	it("bounds how many renders run at once", async () => {
		let active = 0;
		let peak = 0;
		const maps = createMapServer({
			source,
			fonts,
			basePath: "/api/map",
			maxConcurrentRenders: 2,
			signing: { secret: SECRET },
			onRender: () => {
				active -= 1;
			},
			templates: {
				gated: defineTemplate({
					...storeMap,
					render: (context) => {
						active += 1;
						peak = Math.max(peak, active);

						return storeMap.render(context);
					},
				}),
			},
		});

		/* Distinct widths, so six distinct keys that coalescing cannot merge. */
		const urls = await Promise.all(
			[601, 602, 603, 604, 605, 606].map(
				async (w) => await maps.url("gated", { ...CARD, w }),
			),
		);

		await Promise.all(urls.map(async (url) => await maps.fetch(get(url))));

		expect(peak).toBeLessThanOrEqual(2);
	});

	it("keeps serving when the store cannot be written", async () => {
		const errors: unknown[] = [];
		const maps = createMapServer({
			source,
			fonts,
			basePath: "/api/map",
			signing: { secret: SECRET },
			onError: (error) => errors.push(error),
			store: {
				get: () => Promise.resolve(null),
				set: () => Promise.reject(new Error("disk full")),
			},
			templates: { store: storeMap },
		});

		const response = await maps.fetch(get(await maps.url("store", CARD)));

		expect(response.status).toBe(200);
		expect(String(errors[0])).toContain("disk full");
	});

	it("redirects to a relative location that no-one can cache", async () => {
		const maps = createServer();
		const url = await maps.url("store", CARD);

		dataVersion = "v2";

		const response = await maps.fetch(
			new Request(new URL(url, "https://evil.example")),
		);
		const location = response.headers.get("Location") ?? "";

		expect(location.startsWith("/api/map?")).toBe(true);
		expect(location).not.toContain("evil.example");
		expect(response.headers.get("Cache-Control")).toBe("no-store");
	});

	it("refuses to mint a parameter that collides with the server's own", async () => {
		await expect(createServer().url("store", { v: "2" })).rejects.toThrow(
			/reserved/,
		);
	});

	it("omits an undefined parameter rather than signing the word", async () => {
		const query = search(
			await createServer().url("store", { ...CARD, note: undefined }),
		);

		expect(query.has("note")).toBe(false);
	});
});

describe("createMapServer", () => {
	it("refuses an empty secret rather than signing with it", () => {
		expect(() =>
			createMapServer({
				source,
				signing: { secret: "" },
				templates: { store: storeMap },
			}),
		).toThrow(/signing secret/);
	});
});
