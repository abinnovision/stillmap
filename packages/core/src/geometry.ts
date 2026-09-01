declare const space: unique symbol;

/**
 * Nominal brand separating the pixel spaces. Structurally `{ x, y }` is the
 * same everywhere, and mixing world with canvas coordinates is the classic
 * renderer bug, so the compiler is made to care about the difference.
 */
interface Space<S extends string> {
	readonly [space]: S;
}

/** Longitude and latitude in degrees, WGS84. GeoJSON axis order. */
export type LngLat = readonly [lng: number, lat: number];
export type LngLatLike =
	LngLat | { readonly lng: number; readonly lat: number };

/** Pixel position on the whole-world plane at the render zoom. */
export type WorldPoint = {
	readonly x: number;
	readonly y: number;
} & Space<"world">;

/** Pixel position in the output canvas, origin top left, CSS pixels. */
export type CanvasPoint = {
	readonly x: number;
	readonly y: number;
} & Space<"canvas">;

/** Pixel position inside a single tile, in that tile's own extent units. */
export type TilePoint = {
	readonly x: number;
	readonly y: number;
} & Space<"tile">;

/** A rectangle on the world plane, in world pixels. */
export interface PixelBounds {
	readonly minX: number;
	readonly minY: number;
	readonly maxX: number;
	readonly maxY: number;
}

type Branded<S extends string> = {
	readonly x: number;
	readonly y: number;
} & Space<S>;

/**
 * The single place a coordinate brand is applied.
 *
 * Object-literal type assertions are banned by lint because they skip
 * excess-property checking. The exception is justified here and nowhere else: a
 * branded type has no constructible value, so no annotation can do the job, and
 * centralising it means the unsafe step happens exactly once.
 */
function brand<S extends string>(x: number, y: number): Branded<S> {
	const point = { x, y };

	return point as Branded<S>;
}

export function world(x: number, y: number): WorldPoint {
	return brand<"world">(x, y);
}

export function canvas(x: number, y: number): CanvasPoint {
	return brand<"canvas">(x, y);
}

export function tile(x: number, y: number): TilePoint {
	return brand<"tile">(x, y);
}

export function toLngLat(value: LngLatLike): LngLat {
	return value instanceof Array ? [value[0], value[1]] : [value.lng, value.lat];
}
