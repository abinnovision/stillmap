import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { TileCoord, TileSchema, TileSource } from "../../src/index.js";

const FIXTURE_DIR = new URL("../fixtures/", import.meta.url);

/** Minimal schema stub. M3 replaces this with the real OpenMapTiles adapter. */
export const fixtureSchema: TileSchema = {
	id: "openmaptiles",
	resolve: (query) => {
		if (query.kind === "water") {
			return [{ sourceLayer: "water" }];
		}

		if (query.kind === "road") {
			const known = [
				"motorway",
				"trunk",
				"primary",
				"secondary",
				"tertiary",
				"minor",
				"service",
			];
			const wanted = (query.classes ?? known).filter((c) => known.includes(c));

			return wanted.length === 0
				? []
				: [
						{
							sourceLayer: "transportation",
							filter: { class: wanted },
							classes: wanted,
						},
					];
		}

		if (query.kind === "place") {
			return [{ sourceLayer: "place" }];
		}

		return [];
	},
	resolveName: (properties) => {
		const raw = properties["name:latin"] ?? properties["name"];

		return typeof raw === "string" && raw.length > 0 ? raw : null;
	},
	resolveRank: (properties) => {
		const rank = Number(properties["rank"]);

		return Number.isFinite(rank) ? rank : 100;
	},
};

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

/**
 * A TileSource backed by the committed fixtures. Coordinates outside the
 * captured pair resolve to `null`, exactly as an empty ocean tile would.
 */
export function createFixtureSource(): TileSource {
	return {
		id: "fixture",
		schema: fixtureSchema,
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
