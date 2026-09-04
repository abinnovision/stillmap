import { describe, expect, it } from "vitest";

import { GridIndex } from "./collision.js";

import type { Box } from "./labels.js";

function box(minX: number, minY: number, maxX: number, maxY: number): Box {
	return { minX, minY, maxX, maxY };
}

describe("gridIndex", () => {
	it("finds an overlap across cell boundaries", () => {
		const grid = new GridIndex(400, 300);

		grid.insert(1, box(20, 20, 60, 40));

		expect(grid.hitTest(box(55, 35, 90, 55))).toBe(true);
		expect(grid.hitTest(box(70, 50, 90, 60))).toBe(false);
	});

	it("stops reporting a removed box", () => {
		const grid = new GridIndex(400, 300);

		grid.insert(1, box(20, 20, 60, 40));
		grid.remove(1);

		expect(grid.hitTest(box(30, 30, 50, 35))).toBe(false);
	});

	it("returns each overlapping occupant exactly once", () => {
		const grid = new GridIndex(400, 300);

		// Spans four cells, so a naive query would report it four times.
		grid.insert(7, box(20, 20, 60, 60));
		grid.insert(8, box(200, 200, 220, 220));

		expect(grid.query(box(0, 0, 100, 100))).toEqual([7]);
	});

	it("keeps boxes overhanging the canvas edge findable", () => {
		const grid = new GridIndex(400, 300);

		grid.insert(1, box(-30, -30, 10, 10));

		expect(grid.hitTest(box(0, 0, 5, 5))).toBe(true);
	});
});
