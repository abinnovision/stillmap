import { canvas, toLngLat, world } from "./geometry.js";

import type {
	CanvasPoint,
	LngLat,
	LngLatLike,
	PixelBounds,
	WorldPoint,
} from "./geometry.js";

/**
 * Vector tiles are addressed as 512 pixel tiles here, matching the OpenMapTiles
 * and Shortbread conventions.
 */
export const TILE_SIZE = 512;

/** The latitude at which the Web Mercator projection is truncated to a square. */
export const MAX_LATITUDE = 85.0511287798;

export function clampLatitude(latitude: number): number {
	return Math.min(MAX_LATITUDE, Math.max(-MAX_LATITUDE, latitude));
}

export function worldSize(zoom: number): number {
	return TILE_SIZE * 2 ** zoom;
}

export function lngLatToWorld(value: LngLatLike, zoom: number): WorldPoint {
	const [lng, lat] = toLngLat(value);
	const size = worldSize(zoom);
	const latitude = (clampLatitude(lat) * Math.PI) / 180;

	const x = ((lng + 180) / 360) * size;
	const y =
		((1 - Math.log(Math.tan(latitude) + 1 / Math.cos(latitude)) / Math.PI) /
			2) *
		size;

	return world(x, y);
}

export function worldToLngLat(point: WorldPoint, zoom: number): LngLat {
	const size = worldSize(zoom);
	const lng = (point.x / size) * 360 - 180;
	const n = Math.PI - 2 * Math.PI * (point.y / size);
	const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

	return [lng, lat];
}

export interface ComputePixelBoundsArgs {
	readonly center: LngLatLike;
	readonly zoom: number;
	readonly width: number;
	readonly height: number;
}

export function computePixelBounds(args: ComputePixelBoundsArgs): PixelBounds {
	const centre = lngLatToWorld(args.center, args.zoom);

	return {
		minX: centre.x - args.width / 2,
		minY: centre.y - args.height / 2,
		maxX: centre.x + args.width / 2,
		maxY: centre.y + args.height / 2,
	};
}

export function toCanvas(point: WorldPoint, bounds: PixelBounds): CanvasPoint {
	return canvas(point.x - bounds.minX, point.y - bounds.minY);
}
