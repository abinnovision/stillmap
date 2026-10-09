import { describe, expect, it } from "vitest";

import { overlayOrigin } from "./declaration.js";

import type { OverlayDeclaration, Placement } from "./declaration.js";

function overlay(
	placement: Placement,
	inset?: OverlayDeclaration["inset"],
): OverlayDeclaration {
	return {
		kind: "overlay",
		placement,
		size: [100, 40],
		...(inset === undefined ? {} : { inset }),
		markup: "",
	};
}

const CANVAS = { width: 400, height: 300 };

describe("overlayOrigin", () => {
	it("pins each corner flush by default", () => {
		expect(overlayOrigin(overlay("top-left"), CANVAS)).toEqual({
			x: 0,
			y: 0,
		});
		expect(overlayOrigin(overlay("top-right"), CANVAS)).toEqual({
			x: 300,
			y: 0,
		});
		expect(overlayOrigin(overlay("bottom-left"), CANVAS)).toEqual({
			x: 0,
			y: 260,
		});
		expect(overlayOrigin(overlay("bottom-right"), CANVAS)).toEqual({
			x: 300,
			y: 260,
		});
	});

	it("moves inward by a scalar inset on both axes", () => {
		expect(overlayOrigin(overlay("top-left", 10), CANVAS)).toEqual({
			x: 10,
			y: 10,
		});
		expect(overlayOrigin(overlay("bottom-right", 10), CANVAS)).toEqual({
			x: 290,
			y: 250,
		});
	});

	it("applies a tuple inset per axis", () => {
		expect(overlayOrigin(overlay("top-right", [8, 12]), CANVAS)).toEqual({
			x: 292,
			y: 12,
		});
		expect(overlayOrigin(overlay("bottom-left", [8, 12]), CANVAS)).toEqual({
			x: 8,
			y: 248,
		});
	});

	it("shifts away from the vertical edge", () => {
		expect(overlayOrigin(overlay("top-left"), CANVAS, 15).y).toBe(15);
		expect(overlayOrigin(overlay("bottom-left"), CANVAS, 15).y).toBe(245);
	});
});
