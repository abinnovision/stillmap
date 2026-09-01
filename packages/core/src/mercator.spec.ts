import { describe, expect, it } from "vitest";

import { world } from "./geometry.js";
import {
	MAX_LATITUDE,
	TILE_SIZE,
	clampLatitude,
	computePixelBounds,
	lngLatToWorld,
	toCanvas,
	worldSize,
	worldToLngLat,
} from "./mercator.js";

describe("mercator", () => {
	it("places the null island at the centre of the world plane", () => {
		const point = lngLatToWorld([0, 0], 0);

		expect(point.x).toBeCloseTo(TILE_SIZE / 2, 6);
		expect(point.y).toBeCloseTo(TILE_SIZE / 2, 6);
	});

	it("doubles the world size for each zoom level", () => {
		expect(worldSize(0)).toBe(512);
		expect(worldSize(1)).toBe(1024);
		expect(worldSize(13)).toBe(512 * 2 ** 13);
	});

	it("round-trips a coordinate through world space", () => {
		const original: readonly [number, number] = [9.9937, 53.5511];
		const roundTripped = worldToLngLat(lngLatToWorld(original, 13), 13);

		expect(roundTripped[0]).toBeCloseTo(original[0], 9);
		expect(roundTripped[1]).toBeCloseTo(original[1], 9);
	});

	it("clamps latitude to the Web Mercator limit", () => {
		expect(clampLatitude(90)).toBe(MAX_LATITUDE);
		expect(clampLatitude(-90)).toBe(-MAX_LATITUDE);
		expect(clampLatitude(53.5511)).toBe(53.5511);
	});

	it("centres the pixel bounds on the requested coordinate", () => {
		const bounds = computePixelBounds({
			center: [9.9937, 53.5511],
			zoom: 13,
			width: 1200,
			height: 300,
		});
		const centre = lngLatToWorld([9.9937, 53.5511], 13);

		expect(bounds.maxX - bounds.minX).toBe(1200);
		expect(bounds.maxY - bounds.minY).toBe(300);
		expect((bounds.minX + bounds.maxX) / 2).toBeCloseTo(centre.x, 6);
		expect((bounds.minY + bounds.maxY) / 2).toBeCloseTo(centre.y, 6);
	});

	it("translates world space into canvas space", () => {
		const bounds = { minX: 100, minY: 200, maxX: 1300, maxY: 500 };

		expect(toCanvas(world(150, 260), bounds)).toEqual({ x: 50, y: 60 });
	});
});
