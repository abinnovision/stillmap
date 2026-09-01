import { describe, expect, it, vi } from "vitest";

import { createTileCache, fetchTiles } from "./tiles.js";
import { createWarningCollector } from "./warnings.js";
import { createFixtureSource } from "../test/support/fixture-source.js";

import type { OpenTileSource, TileSchema, TileSource } from "./source.js";

const schema: TileSchema = {
	id: "test",
	resolve: () => [],
	resolveName: () => null,
	resolveRank: () => 100,
};

function stubSource(opened: OpenTileSource): TileSource {
	return {
		id: "stub",
		schema,
		attribution: [{ text: "Stub" }],
		open: () => Promise.resolve(opened),
	};
}

const signal = new AbortController().signal;

describe("fetchTiles", () => {
	it("fetches each requested tile once and keys by version", async () => {
		const fetchTile = vi.fn(() => Promise.resolve(new ArrayBuffer(8)));
		const opened: OpenTileSource = {
			minZoom: 0,
			maxZoom: 14,
			version: "v1",
			fetchTile,
		};

		const result = await fetchTiles({
			coords: [
				{ z: 13, column: 4323, y: 2647 },
				{ z: 13, column: 4324, y: 2647 },
			],
			source: stubSource(opened),
			opened,
			cache: createTileCache(),
			signal,
			warn: createWarningCollector({}),
		});

		expect(fetchTile).toHaveBeenCalledTimes(2);
		expect(result.get("stub/v1/13/4323/2647")).toBeInstanceOf(ArrayBuffer);
	});

	it("serves a repeated tile from the cache", async () => {
		const fetchTile = vi.fn(() => Promise.resolve(new ArrayBuffer(8)));
		const opened: OpenTileSource = {
			minZoom: 0,
			maxZoom: 14,
			version: "v1",
			fetchTile,
		};
		const cache = createTileCache();
		const coords = [{ z: 13, column: 4323, y: 2647 }];
		const shared = {
			source: stubSource(opened),
			opened,
			cache,
			signal,
			warn: createWarningCollector({}),
		};

		await fetchTiles({ coords, ...shared });
		await fetchTiles({ coords, ...shared });

		expect(fetchTile).toHaveBeenCalledTimes(1);
	});

	it("records a warning and continues when one tile fails", async () => {
		const fetchTile = vi.fn((coord: { column: number }) =>
			coord.column === 4323
				? Promise.reject(new Error("boom"))
				: Promise.resolve(new ArrayBuffer(8)),
		);
		const opened: OpenTileSource = {
			minZoom: 0,
			maxZoom: 14,
			version: "v1",
			fetchTile,
		};
		const warn = createWarningCollector({});

		const result = await fetchTiles({
			coords: [
				{ z: 13, column: 4323, y: 2647 },
				{ z: 13, column: 4324, y: 2647 },
			],
			source: stubSource(opened),
			opened,
			cache: createTileCache(),
			signal,
			warn,
		});

		expect(warn.warnings.map((entry) => entry.code)).toEqual([
			"TILE_FETCH_FAILED",
		]);
		expect(result.get("stub/v1/13/4323/2647")).toBeNull();
		expect(result.get("stub/v1/13/4324/2647")).toBeInstanceOf(ArrayBuffer);
	});

	it("evicts least recently used entries past the limit", async () => {
		const fetchTile = vi.fn(() => Promise.resolve(new ArrayBuffer(8)));
		const opened: OpenTileSource = {
			minZoom: 0,
			maxZoom: 14,
			version: "v1",
			fetchTile,
		};
		const cache = createTileCache(1);
		const shared = {
			source: stubSource(opened),
			opened,
			cache,
			signal,
			warn: createWarningCollector({}),
		};

		await fetchTiles({ coords: [{ z: 13, column: 1, y: 1 }], ...shared });
		await fetchTiles({ coords: [{ z: 13, column: 2, y: 2 }], ...shared });
		await fetchTiles({ coords: [{ z: 13, column: 1, y: 1 }], ...shared });

		expect(fetchTile).toHaveBeenCalledTimes(3);
	});
});

describe("fixture source", () => {
	it("reads the committed tiles from disk", async () => {
		const source = createFixtureSource();
		const opened = await source.open({ signal, fetch });

		const present = await opened.fetchTile(
			{ z: 13, column: 4323, y: 2647 },
			signal,
		);
		const absent = await opened.fetchTile({ z: 13, column: 1, y: 1 }, signal);

		expect(present?.byteLength).toBeGreaterThan(1000);
		expect(absent).toBeNull();
	});
});
