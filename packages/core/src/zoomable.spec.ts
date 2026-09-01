import { describe, expect, it } from "vitest";

import { resolveZoomable } from "./zoomable.js";

describe("resolveZoomable", () => {
	it("returns a literal unchanged", () => {
		expect(resolveZoomable(3.2, 13)).toBe(3.2);
		expect(resolveZoomable("#FCFBF9", 13)).toBe("#FCFBF9");
	});

	it("evaluates a function at the render zoom", () => {
		const width = (zoom: number): number => (zoom < 13 ? 2.2 : 3.2);

		expect(resolveZoomable(width, 11)).toBe(2.2);
		expect(resolveZoomable(width, 15)).toBe(3.2);
	});

	it("does not mistake an array literal for a function", () => {
		expect(resolveZoomable<readonly number[]>([4, 3], 13)).toEqual([4, 3]);
	});
});
