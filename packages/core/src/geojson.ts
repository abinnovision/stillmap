import { lngLatToWorld } from "./mercator.js";

import type { DecodedFeature } from "./decode.js";
import type { FeatureProperties, PropertyValue } from "./filter.js";
import type { LngLat, WorldPoint } from "./geometry.js";
import type { WarningCollector } from "./warnings.js";

/*
 * GeoJSON discriminates on `type` rather than `kind`: it is an external
 * format, and these types stay structurally compatible with `@types/geojson`.
 */

/** Longitude and latitude, plus an optional altitude that is ignored. */
export type GeoJsonPosition = readonly number[];

export interface GeoJsonPoint {
	readonly type: "Point";
	readonly coordinates: GeoJsonPosition;
}

export interface GeoJsonMultiPoint {
	readonly type: "MultiPoint";
	readonly coordinates: readonly GeoJsonPosition[];
}

export interface GeoJsonLineString {
	readonly type: "LineString";
	readonly coordinates: readonly GeoJsonPosition[];
}

export interface GeoJsonMultiLineString {
	readonly type: "MultiLineString";
	readonly coordinates: readonly (readonly GeoJsonPosition[])[];
}

export interface GeoJsonPolygon {
	readonly type: "Polygon";
	readonly coordinates: readonly (readonly GeoJsonPosition[])[];
}

export interface GeoJsonMultiPolygon {
	readonly type: "MultiPolygon";
	readonly coordinates: readonly (readonly (readonly GeoJsonPosition[])[])[];
}

export interface GeoJsonGeometryCollection {
	readonly type: "GeometryCollection";
	readonly geometries: readonly GeoJsonGeometry[];
}

export type GeoJsonGeometry =
	| GeoJsonPoint
	| GeoJsonMultiPoint
	| GeoJsonLineString
	| GeoJsonMultiLineString
	| GeoJsonPolygon
	| GeoJsonMultiPolygon
	| GeoJsonGeometryCollection;

export interface GeoJsonFeature {
	readonly type: "Feature";
	readonly geometry: GeoJsonGeometry | null;
	readonly properties?: Readonly<Record<string, unknown>> | null;
}

export interface GeoJsonFeatureCollection {
	readonly type: "FeatureCollection";
	readonly features: readonly GeoJsonFeature[];
}

export type GeoJsonInput =
	GeoJsonFeatureCollection | GeoJsonFeature | GeoJsonGeometry;

type Ring = readonly LngLat[];

interface Parts {
	readonly points: LngLat[];
	readonly lines: Ring[];
	readonly polygons: (readonly Ring[])[];
}

interface ParsedFeature {
	readonly feature: GeoJsonFeature;
	/** Null when the geometry is malformed. */
	readonly parts: Parts | null;
}

function toPosition(value: GeoJsonPosition): LngLat | null {
	const [lng, lat] = value;

	return lng !== undefined &&
		lat !== undefined &&
		Number.isFinite(lng) &&
		Number.isFinite(lat)
		? [lng, lat]
		: null;
}

function toRing(
	positions: readonly GeoJsonPosition[],
	minLength: number,
): Ring | null {
	if (positions.length < minLength) {
		return null;
	}

	const ring: LngLat[] = [];

	for (const position of positions) {
		const point = toPosition(position);

		if (point === null) {
			return null;
		}

		ring.push(point);
	}

	return ring;
}

function toRings(
	lists: readonly (readonly GeoJsonPosition[])[],
	minLength: number,
): Ring[] | null {
	const rings: Ring[] = [];

	for (const positions of lists) {
		const ring = toRing(positions, minLength);

		if (ring === null) {
			return null;
		}

		rings.push(ring);
	}

	return rings;
}

/** Adds a geometry's parts. Returns false when any part is malformed. */
function addGeometry(geometry: GeoJsonGeometry, parts: Parts): boolean {
	switch (geometry.type) {
		case "Point":
			return addGeometry(
				{ type: "MultiPoint", coordinates: [geometry.coordinates] },
				parts,
			);
		case "MultiPoint": {
			const points = toRing(geometry.coordinates, 0);

			if (points === null) {
				return false;
			}

			parts.points.push(...points);

			return true;
		}

		case "LineString":
			return addGeometry(
				{ type: "MultiLineString", coordinates: [geometry.coordinates] },
				parts,
			);
		case "MultiLineString": {
			const lines = toRings(geometry.coordinates, 2);

			if (lines === null) {
				return false;
			}

			parts.lines.push(...lines);

			return true;
		}

		case "Polygon":
			return addGeometry(
				{ type: "MultiPolygon", coordinates: [geometry.coordinates] },
				parts,
			);
		case "MultiPolygon": {
			for (const polygon of geometry.coordinates) {
				const rings = toRings(polygon, 4);

				if (rings === null || rings.length === 0) {
					return false;
				}

				parts.polygons.push(rings);
			}

			return true;
		}

		case "GeometryCollection":
			return geometry.geometries.every((child) => addGeometry(child, parts));
		default:
			return false;
	}
}

function featuresOf(data: GeoJsonInput): readonly GeoJsonFeature[] {
	switch (data.type) {
		case "FeatureCollection":
			return data.features;
		case "Feature":
			return [data];
		default:
			return [{ type: "Feature", geometry: data }];
	}
}

function parse(data: GeoJsonInput): readonly ParsedFeature[] {
	return featuresOf(data).map((feature) => {
		const parts: Parts = { points: [], lines: [], polygons: [] };
		const valid =
			feature.geometry === null || addGeometry(feature.geometry, parts);

		return { feature, parts: valid ? parts : null };
	});
}

/** Keeps the scalar properties a `Filter` can match against. */
function narrowProperties(
	properties: GeoJsonFeature["properties"],
): FeatureProperties {
	return Object.fromEntries(
		Object.entries(properties ?? {}).filter(
			(entry): entry is [string, PropertyValue] =>
				typeof entry[1] === "string" ||
				typeof entry[1] === "number" ||
				typeof entry[1] === "boolean",
		),
	);
}

/** Twice the signed area. Positive is clockwise on the y-down world plane. */
function signedArea(ring: readonly WorldPoint[]): number {
	let sum = 0;

	for (let index = 0; index < ring.length; index++) {
		const a = ring[index];
		const b = ring[(index + 1) % ring.length];

		if (a !== undefined && b !== undefined) {
			sum += a.x * b.y - b.x * a.y;
		}
	}

	return sum;
}

/**
 * Winds outer rings clockwise and holes counter-clockwise, so the `nonzero`
 * fill rule cuts holes regardless of the winding the input used.
 */
function wind(
	ring: readonly WorldPoint[],
	outer: boolean,
): readonly WorldPoint[] {
	return signedArea(ring) > 0 === outer ? ring : [...ring].reverse();
}

export interface ProjectGeoJsonArgs {
	readonly data: GeoJsonInput;
	/** `fill` keeps polygons; `line` keeps line strings and polygon outlines. */
	readonly kind: "fill" | "line";
	/** Source layer name the projected features are tagged with. */
	readonly layer: string;
	readonly zoom: number;
	readonly warn: WarningCollector;
}

/**
 * Projects GeoJSON into world pixels at the render zoom, shaped like decoded
 * tile features so the same paint rules apply. Points are not drawn here.
 */
export function projectGeoJson(args: ProjectGeoJsonArgs): DecodedFeature[] {
	const project = (ring: Ring): readonly WorldPoint[] =>
		ring.map((point) => lngLatToWorld(point, args.zoom));
	const features: DecodedFeature[] = [];

	for (const [index, { feature, parts }] of parse(args.data).entries()) {
		if (parts === null) {
			args.warn.warn(
				"GEOJSON_INVALID",
				`GeoJSON feature ${String(index)} is malformed and was skipped.`,
				{ layer: args.layer, index },
			);
			continue;
		}

		const geometry =
			args.kind === "fill"
				? parts.polygons.flatMap((rings) =>
						rings.map((ring, i) => wind(project(ring), i === 0)),
					)
				: [...parts.lines, ...parts.polygons.flat()].map(project);

		if (geometry.length === 0) {
			continue;
		}

		features.push({
			layer: args.layer,
			type: args.kind === "fill" ? 3 : 2,
			properties: narrowProperties(feature.properties),
			geometry,
		});
	}

	return features;
}

/** Every Point and MultiPoint position, in input order. */
export function geoJsonPoints(data: GeoJsonInput): LngLat[] {
	return parse(data).flatMap(({ parts }) => parts?.points ?? []);
}

/** South-west and north-east corners of every valid position, or null. */
export function geoJsonBounds(
	data: GeoJsonInput,
): readonly [LngLat, LngLat] | null {
	let minLng = Infinity;
	let minLat = Infinity;
	let maxLng = -Infinity;
	let maxLat = -Infinity;

	for (const { parts } of parse(data)) {
		if (parts === null) {
			continue;
		}

		for (const [lng, lat] of [
			...parts.points,
			...parts.lines.flat(),
			...parts.polygons.flat(2),
		]) {
			minLng = Math.min(minLng, lng);
			minLat = Math.min(minLat, lat);
			maxLng = Math.max(maxLng, lng);
			maxLat = Math.max(maxLat, lat);
		}
	}

	return minLng === Infinity
		? null
		: [
				[minLng, minLat],
				[maxLng, maxLat],
			];
}
