import { openMapTiles } from "@stillmap/sources";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { TileCoord, TileSource } from "@stillmap/core";

const FIXTURE_DIR = new URL(
	"../../../../packages/core/test/fixtures/",
	import.meta.url,
);

async function readFixture(coord: TileCoord): Promise<ArrayBuffer | null> {
	const name = `openfreemap-z${String(coord.z)}-${String(coord.column)}-${String(coord.y)}.mvt`;

	try {
		const buffer = await readFile(fileURLToPath(new URL(name, FIXTURE_DIR)));

		return buffer.buffer.slice(
			buffer.byteOffset,
			buffer.byteOffset + buffer.byteLength,
		);
	} catch {
		return null;
	}
}

/** Offline stand-in for `openFreeMap()`, backed by the committed tiles. */
export function createFixtureSource(): TileSource {
	return {
		id: "fixture",
		schema: openMapTiles(),
		attribution: [
			{ text: "OpenFreeMap (c) OpenMapTiles Data from OpenStreetMap" },
		],
		open: () =>
			Promise.resolve({
				minZoom: 0,
				maxZoom: 14,
				version: "fixture",
				fetchTile: readFixture,
			}),
	};
}
