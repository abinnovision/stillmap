import { describe, expect, it, vi } from "vitest";

import { buildTileUrl, httpTileSource } from "./http.js";

import type { TileSchema } from "@stillmap/core";

const schema: TileSchema = {
	id: "openmaptiles",
	resolve: () => [],
	resolveName: () => null,
	resolveRank: () => 100,
};

const attribution = [{ text: "Test" }];
const signal = new AbortController().signal;
const coord = { z: 13, column: 4402, y: 2685 };

describe("buildTileUrl", () => {
	it("substitutes every placeholder", () => {
		expect(buildTileUrl("https://t.example/{z}/{x}/{y}.pbf", coord)).toBe(
			"https://t.example/13/4402/2685.pbf",
		);
	});
});

describe("httpTileSource", () => {
	it("uses a static template without any network call", async () => {
		const fetchMock = vi.fn();
		const source = httpTileSource({
			id: "static",
			schema,
			attribution,
			template: "https://t.example/{z}/{x}/{y}.pbf",
			minZoom: 0,
			maxZoom: 14,
		});

		const opened = await source.open({ signal, fetch: fetchMock as never });

		expect(fetchMock).not.toHaveBeenCalled();
		expect(opened.maxZoom).toBe(14);
	});

	it("resolves a TileJSON endpoint and reads its zoom range", async () => {
		const fetchMock = vi.fn(() =>
			Promise.resolve(
				new Response(
					JSON.stringify({
						tiles: ["https://t.example/v20260901/{z}/{x}/{y}.pbf"],
						minzoom: 0,
						maxzoom: 14,
					}),
					{ status: 200 },
				),
			),
		);

		const opened = await httpTileSource({
			id: "tilejson",
			schema,
			attribution,
			tilejson: "https://t.example/planet",
		}).open({ signal, fetch: fetchMock });

		expect(fetchMock).toHaveBeenCalledOnce();
		expect(opened.maxZoom).toBe(14);
		expect(opened.version).toContain("v20260901");
	});

	it("returns null for a 404 rather than throwing", async () => {
		const fetchMock = vi.fn(() =>
			Promise.resolve(new Response(null, { status: 404 })),
		);
		const opened = await httpTileSource({
			id: "static",
			schema,
			attribution,
			template: "https://t.example/{z}/{x}/{y}.pbf",
		}).open({ signal, fetch: fetchMock });

		await expect(opened.fetchTile(coord, signal)).resolves.toBeNull();
	});

	it("returns null for an empty body", async () => {
		const fetchMock = vi.fn(() =>
			Promise.resolve(new Response(new ArrayBuffer(0), { status: 200 })),
		);
		const opened = await httpTileSource({
			id: "static",
			schema,
			attribution,
			template: "https://t.example/{z}/{x}/{y}.pbf",
		}).open({ signal, fetch: fetchMock });

		await expect(opened.fetchTile(coord, signal)).resolves.toBeNull();
	});

	it("throws on a server error so core's retry policy can act", async () => {
		const fetchMock = vi.fn(() =>
			Promise.resolve(new Response(null, { status: 503 })),
		);
		const opened = await httpTileSource({
			id: "static",
			schema,
			attribution,
			template: "https://t.example/{z}/{x}/{y}.pbf",
		}).open({ signal, fetch: fetchMock });

		await expect(opened.fetchTile(coord, signal)).rejects.toThrow(/503/);
	});
});
