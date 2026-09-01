import { httpTileSource } from "../http.js";
import { openMapTiles } from "../schemas/openmaptiles.js";

import type { TileSource } from "@stillmap/core";

const TILEJSON_URL = "https://tiles.openfreemap.org/planet";

/**
 * OpenFreeMap: free planet-wide OpenMapTiles vector tiles with no API key.
 *
 * The tile URL is versioned and rotates, so the template is resolved from
 * TileJSON on every open rather than hardcoded.
 */
export function openFreeMap(): TileSource {
	return httpTileSource({
		id: "openfreemap",
		schema: openMapTiles(),
		attribution: [
			{ text: "OpenFreeMap", url: "https://openfreemap.org" },
			{ text: "(c) OpenMapTiles", url: "https://openmaptiles.org" },
			{
				text: "Data from OpenStreetMap",
				url: "https://www.openstreetmap.org/copyright",
			},
		],
		tilejson: TILEJSON_URL,
	});
}
