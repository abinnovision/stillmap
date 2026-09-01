import { StillmapError } from "./errors.js";
import { TILE_SIZE } from "./mercator.js";

import type { PixelBounds } from "./geometry.js";

/**
 * A viewport needing more tiles than this indicates a bug in the zoom or size
 * handling rather than a legitimate render.
 */
export const MAX_TILES_PER_RENDER = 24;

/** Slippy tile address. `column` wraps at the antimeridian; `y` does not. */
export interface TileCoord {
	readonly z: number;
	readonly column: number;
	readonly y: number;
}

export interface TileCoverArgs {
	readonly bounds: PixelBounds;
	/** The zoom the map is drawn at. May be fractional. */
	readonly displayZoom: number;
	/** Deepest zoom the source actually publishes data for. */
	readonly maxDataZoom: number;
	readonly maxTiles?: number;
}

export interface TileCoverResult {
	readonly tiles: readonly TileCoord[];
	/** The zoom tiles are fetched at, which is `min(displayZoom, maxDataZoom)`. */
	readonly dataZoom: number;
	/** Width of one fetched tile in display pixels, after overzoom stretching. */
	readonly tileDisplaySize: number;
}

export function computeTileCover(args: TileCoverArgs): TileCoverResult {
	const dataZoom = Math.min(Math.floor(args.displayZoom), args.maxDataZoom);
	const overzoom = 2 ** (args.displayZoom - dataZoom);
	const tileDisplaySize = TILE_SIZE * overzoom;
	const gridSize = 2 ** dataZoom;
	const budget = args.maxTiles ?? MAX_TILES_PER_RENDER;

	const firstColumn = Math.floor(args.bounds.minX / tileDisplaySize);
	const lastColumn = Math.floor((args.bounds.maxX - 1e-9) / tileDisplaySize);
	const firstRow = Math.floor(args.bounds.minY / tileDisplaySize);
	const lastRow = Math.floor((args.bounds.maxY - 1e-9) / tileDisplaySize);

	const count = (lastColumn - firstColumn + 1) * (lastRow - firstRow + 1);

	if (count > budget) {
		throw new StillmapError(
			"TILE_BUDGET_EXCEEDED",
			`Rendering this viewport needs ${String(count)} tiles, over the budget of ${String(budget)}.`,
			{ requested: count, budget, dataZoom },
		);
	}

	const tiles: TileCoord[] = [];

	for (let row = firstRow; row <= lastRow; row++) {
		// Rows outside the projection are empty, not wrapped.
		if (row < 0 || row >= gridSize) {
			continue;
		}

		for (let column = firstColumn; column <= lastColumn; column++) {
			// Columns wrap: the world repeats east and west.
			const wrapped = ((column % gridSize) + gridSize) % gridSize;

			tiles.push({ z: dataZoom, column: wrapped, y: row });
		}
	}

	return { tiles, dataZoom, tileDisplaySize };
}

export function tileKey(coord: TileCoord, version: string): string {
	return `${version}/${String(coord.z)}/${String(coord.column)}/${String(coord.y)}`;
}
