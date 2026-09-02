import { resolveZoomable } from "@stillmap/core";
import { describe, expect, it } from "vitest";

import { step } from "./ramp.js";

const at = (zoom: number): number =>
	resolveZoomable(
		step(
			[
				[13, 2.2],
				[15, 3.2],
			],
			4.6,
		),
		zoom,
	);

describe("step", () => {
	it("takes the first stop below its breakpoint", () => {
		expect(at(0)).toBe(2.2);
		expect(at(12.9)).toBe(2.2);
	});

	it("treats a breakpoint as belonging to the band above it", () => {
		expect(at(13)).toBe(3.2);
		expect(at(14.9)).toBe(3.2);
	});

	it("takes the tail from the last breakpoint upwards", () => {
		expect(at(15)).toBe(4.6);
		expect(at(22)).toBe(4.6);
	});

	it("is the tail everywhere with no stops", () => {
		expect(resolveZoomable(step([], 1.5), 0)).toBe(1.5);
		expect(resolveZoomable(step([], 1.5), 20)).toBe(1.5);
	});
});
