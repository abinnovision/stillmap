import { describe, expect, it } from "vitest";

import { geoJsonBounds, geoJsonPoints, projectGeoJson } from "./geojson.js";
import { createWarningCollector } from "./warnings.js";

import type { GeoJsonInput, GeoJsonPosition } from "./geojson.js";
import type { WorldPoint } from "./geometry.js";

/** A square ring, counter-clockwise in lng/lat, so clockwise on screen. */
function square(
	min: number,
	max: number,
	reverse = false,
): readonly GeoJsonPosition[] {
	const ring: GeoJsonPosition[] = [
		[min, min],
		[max, min],
		[max, max],
		[min, max],
		[min, min],
	];

	return reverse ? ring.reverse() : ring;
}

function area(ring: readonly WorldPoint[] | undefined): number {
	let sum = 0;

	for (const [index, a] of (ring ?? []).entries()) {
		const b = ring?.[(index + 1) % ring.length];

		sum += b === undefined ? 0 : a.x * b.y - b.x * a.y;
	}

	return sum;
}

function project(
	data: GeoJsonInput,
	kind: "fill" | "line" = "fill",
): ReturnType<typeof projectGeoJson> {
	return projectGeoJson({
		data,
		kind,
		layer: "data:0",
		zoom: 0,
		warn: createWarningCollector({}),
	});
}

describe("projectGeoJson", () => {
	it("projects positions into world pixels at the zoom", () => {
		const [feature] = project(
			{
				type: "LineString",
				coordinates: [
					[0, 0],
					[90, 0],
				],
			},
			"line",
		);

		expect(feature?.type).toBe(2);
		expect(feature?.geometry[0]?.[0]).toMatchObject({ x: 256, y: 256 });
		expect(feature?.geometry[0]?.[1]).toMatchObject({ x: 384, y: 256 });
	});

	it("winds a hole opposite to its outer ring", () => {
		const [feature] = project({
			type: "Polygon",
			coordinates: [square(-10, 10), square(-5, 5)],
		});
		const [outer, hole] = feature?.geometry ?? [];

		expect(Math.sign(area(outer))).toBe(-Math.sign(area(hole)));
	});

	it("draws polygon rings as outlines for a line layer", () => {
		const features = project(
			{ type: "Polygon", coordinates: [square(-10, 10)] },
			"line",
		);

		expect(features).toHaveLength(1);
		expect(features[0]?.type).toBe(2);
	});

	it("keeps only scalar properties", () => {
		const [feature] = project({
			type: "Feature",
			geometry: { type: "Polygon", coordinates: [square(0, 1)] },
			properties: {
				name: "Altstadt",
				rank: 1,
				open: true,
				tags: ["a"],
				meta: {},
			},
		});

		expect(feature?.properties).toEqual({
			name: "Altstadt",
			rank: 1,
			open: true,
		});
	});

	it("skips a feature with a short ring and warns once", () => {
		const warn = createWarningCollector({});
		const features = projectGeoJson({
			data: {
				type: "FeatureCollection",
				features: [
					{
						type: "Feature",
						geometry: {
							type: "Polygon",
							coordinates: [
								[
									[0, 0],
									[1, 0],
									[0, 0],
								],
							],
						},
					},
					{
						type: "Feature",
						geometry: { type: "Polygon", coordinates: [square(0, 1)] },
					},
				],
			},
			kind: "fill",
			layer: "data:0",
			zoom: 0,
			warn,
		});

		expect(features).toHaveLength(1);
		expect(warn.warnings.map((w) => w.code)).toEqual(["GEOJSON_INVALID"]);
	});
});

describe("geoJsonPoints", () => {
	it("returns Point and MultiPoint positions only", () => {
		expect(
			geoJsonPoints({
				type: "GeometryCollection",
				geometries: [
					{ type: "Point", coordinates: [1, 2] },
					{
						type: "MultiPoint",
						coordinates: [
							[3, 4],
							[5, 6],
						],
					},
					{ type: "Polygon", coordinates: [square(0, 1)] },
				],
			}),
		).toEqual([
			[1, 2],
			[3, 4],
			[5, 6],
		]);
	});
});

describe("geoJsonBounds", () => {
	it("spans every position", () => {
		expect(
			geoJsonBounds({
				type: "FeatureCollection",
				features: [
					{
						type: "Feature",
						geometry: { type: "Point", coordinates: [9, 53] },
					},
					{
						type: "Feature",
						geometry: { type: "Polygon", coordinates: [square(10, 11)] },
					},
				],
			}),
		).toEqual([
			[9, 10],
			[11, 53],
		]);
	});

	it("is null when there is nothing to bound", () => {
		expect(
			geoJsonBounds({ type: "FeatureCollection", features: [] }),
		).toBeNull();
	});
});
