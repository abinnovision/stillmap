import { describe, expect, it } from "vitest";

import { computePixelBounds } from "./mercator.js";
import { computeTileCover, tileKey } from "./tile-cover.js";

const bounds = computePixelBounds({
	center: [9.9937, 53.5511],
	zoom: 13,
	width: 1200,
	height: 300,
});

describe("computeTileCover", () => {
	it("covers the viewport at the display zoom", () => {
		const cover = computeTileCover({
			bounds,
			displayZoom: 13,
			maxDataZoom: 14,
		});

		expect(cover.dataZoom).toBe(13);
		expect(cover.tileDisplaySize).toBe(512);
		expect(cover.tiles.length).toBeGreaterThan(0);
		expect(cover.tiles.every((t) => t.z === 13)).toBe(true);
	});

	it("overzooms when the display zoom exceeds the data zoom", () => {
		const deep = computePixelBounds({
			center: [9.9937, 53.5511],
			zoom: 16,
			width: 600,
			height: 400,
		});
		const cover = computeTileCover({
			bounds: deep,
			displayZoom: 16,
			maxDataZoom: 14,
		});

		expect(cover.dataZoom).toBe(14);
		// Each z14 tile is stretched across four display zoom levels' worth of pixels.
		expect(cover.tileDisplaySize).toBe(512 * 2 ** 2);
	});

	it("wraps columns across the antimeridian without wrapping rows", () => {
		const wrapped = computePixelBounds({
			center: [179.99, 0],
			zoom: 2,
			width: 1200,
			height: 300,
		});
		const cover = computeTileCover({
			bounds: wrapped,
			displayZoom: 2,
			maxDataZoom: 14,
		});

		expect(cover.tiles.every((t) => t.column >= 0 && t.column < 2 ** 2)).toBe(
			true,
		);
		expect(cover.tiles.every((t) => t.y >= 0 && t.y < 2 ** 2)).toBe(true);
	});

	it("throws rather than fetching an absurd number of tiles", () => {
		const huge = computePixelBounds({
			center: [0, 0],
			zoom: 14,
			width: 8000,
			height: 8000,
		});

		expect(() =>
			computeTileCover({ bounds: huge, displayZoom: 14, maxDataZoom: 14 }),
		).toThrow(/budget/i);
	});
});

describe("tileKey", () => {
	it("includes the version so a rotated tile URL invalidates the cache", () => {
		const coord = { z: 13, column: 4402, y: 2685 };

		expect(tileKey(coord, "20260901")).toBe("20260901/13/4402/2685");
		expect(tileKey(coord, "20260908")).not.toBe(tileKey(coord, "20260901"));
	});
});
