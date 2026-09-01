import { VectorTile } from "@mapbox/vector-tile";
import { PbfReader as Pbf } from "pbf";

import { world } from "./geometry.js";

import type { FeatureProperties } from "./filter.js";
import type { WorldPoint } from "./geometry.js";
import type { TileCoord } from "./tile-cover.js";
import type { VectorTileLayer } from "@mapbox/vector-tile";

/** Vector tile geometry types: unknown, point, line string, polygon. */
export type GeometryType = 0 | 1 | 2 | 3;

export interface DecodedFeature {
	readonly layer: string;
	readonly type: GeometryType;
	readonly properties: FeatureProperties;
	/**
	 * Rings for polygons, line strings otherwise, already projected into world
	 * pixel space at the display zoom.
	 */
	readonly geometry: readonly (readonly WorldPoint[])[];
}

export interface DecodeTileArgs {
	readonly buffer: ArrayBuffer;
	readonly coord: TileCoord;
	/** Width of this tile in display pixels, after any overzoom stretching. */
	readonly tileDisplaySize: number;
	/** Only these layers are parsed, which removes most of the decoding cost. */
	readonly sourceLayers: readonly string[];
}

export function decodeTile(args: DecodeTileArgs): DecodedFeature[] {
	const tile = new VectorTile(new Pbf(args.buffer));
	const layers = tile.layers as Record<string, VectorTileLayer | undefined>;
	const features: DecodedFeature[] = [];

	const originX = args.coord.column * args.tileDisplaySize;
	const originY = args.coord.y * args.tileDisplaySize;

	for (const layerName of args.sourceLayers) {
		const layer = layers[layerName];

		if (!layer) {
			continue;
		}

		const scale = args.tileDisplaySize / layer.extent;

		for (let index = 0; index < layer.length; index++) {
			const feature = layer.feature(index);

			features.push({
				layer: layerName,
				type: feature.type,
				properties: feature.properties,
				geometry: feature
					.loadGeometry()
					.map((ring) =>
						ring.map((point) =>
							world(originX + point.x * scale, originY + point.y * scale),
						),
					),
			});
		}
	}

	return features;
}
