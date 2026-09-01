import { StillmapError } from "@stillmap/core";
import { describe, expect, it } from "vitest";

import { fitMarkers } from "./fit.js";

import type { MarkerDeclaration } from "@stillmap/core";

function marker(lng: number, lat: number): MarkerDeclaration {
	return {
		kind: "marker",
		position: [lng, lat],
		size: [28, 36],
		anchor: "bottom",
		markup: "",
	};
}

describe("fitMarkers", () => {
	it("centres on the midpoint of the marker bounds", () => {
		const { center } = fitMarkers({
			markers: [marker(9.9, 53.5), marker(10.1, 53.6)],
			width: 800,
			height: 600,
			maxZoom: 17,
		});

		expect(center[0]).toBeCloseTo(10.0, 3);
		expect(center[1]).toBeCloseTo(53.55, 2);
	});

	it("chooses a zoom that keeps every marker inside the canvas", () => {
		const tight = fitMarkers({
			markers: [marker(9.99, 53.55), marker(10.0, 53.56)],
			width: 800,
			height: 600,
			maxZoom: 17,
		});
		const wide = fitMarkers({
			markers: [marker(0, 0), marker(20, 40)],
			width: 800,
			height: 600,
			maxZoom: 17,
		});

		expect(tight.zoom).toBeGreaterThan(wide.zoom);
	});

	it("never exceeds maxZoom", () => {
		const { zoom } = fitMarkers({
			markers: [marker(9.9937, 53.5511), marker(9.9938, 53.5512)],
			width: 800,
			height: 600,
			maxZoom: 14,
		});

		expect(zoom).toBeLessThanOrEqual(14);
	});

	it("uses the fallback zoom when a single marker collapses the bounds", () => {
		const { zoom, center } = fitMarkers({
			markers: [marker(9.9937, 53.5511)],
			width: 800,
			height: 600,
			maxZoom: 17,
			fallbackZoom: 13,
		});

		expect(zoom).toBe(13);
		expect(center[0]).toBeCloseTo(9.9937, 6);
	});

	it("accounts for box overhang so a bottom-anchored pin is not clipped", () => {
		const withBox = fitMarkers({
			markers: [marker(9.9, 53.5), marker(10.1, 53.6)],
			width: 800,
			height: 600,
			maxZoom: 17,
		});
		const asPoints = fitMarkers({
			markers: [
				{ ...marker(9.9, 53.5), size: [0, 0] },
				{ ...marker(10.1, 53.6), size: [0, 0] },
			],
			width: 800,
			height: 600,
			maxZoom: 17,
		});

		expect(withBox.zoom).toBeLessThan(asPoints.zoom);
	});

	it("throws when there is nothing to fit", () => {
		expect(() =>
			fitMarkers({ markers: [], width: 800, height: 600, maxZoom: 17 }),
		).toThrow(StillmapError);
	});
});
