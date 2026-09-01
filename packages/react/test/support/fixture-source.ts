import { openMapTiles } from "@stillmap/sources";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { TileCoord, TileSource } from "@stillmap/core";

/**
 * Tiles come from core's committed fixtures, but the schema is the real
 * OpenMapTiles adapter rather than a stub, so these tests exercise the same
 * resolution path a consumer gets.
 *
 * Only the `.mvt` data files are shared across packages. Importing core's test
 * helper directly would pull core's sources into this package's TypeScript
 * program and break its `rootDir`.
 */
const FIXTURE_DIR = new URL("../../../core/test/fixtures/", import.meta.url);

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
