import { describe, expect, it } from "vitest";

import { canvas, toLngLat, world } from "./geometry.js";

describe("geometry", () => {
	it("constructs branded points that carry their coordinates", () => {
		expect(world(10, 20)).toEqual({ x: 10, y: 20 });
		expect(canvas(3, 4)).toEqual({ x: 3, y: 4 });
	});

	it("normalises both LngLatLike forms to a tuple", () => {
		expect(toLngLat([9.9937, 53.5511])).toEqual([9.9937, 53.5511]);
		expect(toLngLat({ lng: 9.9937, lat: 53.5511 })).toEqual([9.9937, 53.5511]);
	});
});
