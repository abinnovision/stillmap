import { describe, expect, it } from "vitest";

import { world } from "./geometry.js";
import { buildPaths } from "./layout.js";

import type { DecodedFeature } from "./decode.js";
import type { PaintRule } from "./style.js";

const bounds = { minX: 100, minY: 100, maxX: 500, maxY: 400 };

const fillRule: PaintRule = {
	kind: "fill",
	order: 0,
	sourceLayer: "water",
	fill: "#E1E4E7",
	fillOpacity: 1,
};
const lineRule: PaintRule = {
	kind: "line",
	order: 1,
	sourceLayer: "transportation",
	stroke: "#FFFFFF",
	width: 2,
	opacity: 1,
};

function polygon(
	points: readonly (readonly [number, number])[],
): DecodedFeature {
	return {
		layer: "water",
		type: 3,
		properties: {},
		geometry: [points.map(([x, y]) => world(x, y))],
	};
}

const line: DecodedFeature = {
	layer: "transportation",
	type: 2,
	properties: {},
	geometry: [[world(150, 150), world(250, 250)]],
};

describe("buildPaths", () => {
	it("emits one path per rule, merging every matching feature", () => {
		const groups = buildPaths({
			features: [
				polygon([
					[150, 150],
					[200, 150],
					[200, 200],
					[150, 150],
				]),
				polygon([
					[300, 300],
					[350, 300],
					[350, 350],
					[300, 300],
				]),
			],
			rules: [fillRule],
			bounds,
			width: 400,
			height: 300,
		});

		expect(groups).toHaveLength(1);
		expect(groups[0]?.rule).toBe(fillRule);
		// Two sub-paths in one d attribute; polygons close with Z.
		expect(groups[0]?.d.match(/M/g)).toHaveLength(2);
		expect(groups[0]?.d).toContain("Z");
	});

	it("translates world coordinates into canvas space", () => {
		const groups = buildPaths({
			features: [
				polygon([
					[150, 150],
					[200, 150],
					[200, 200],
					[150, 150],
				]),
			],
			rules: [fillRule],
			bounds,
			width: 400,
			height: 300,
		});

		// 150 - minX 100 = 50.
		expect(groups[0]?.d.startsWith("M50 50")).toBe(true);
	});

	it("does not close line geometry", () => {
		const groups = buildPaths({
			features: [line],
			rules: [lineRule],
			bounds,
			width: 400,
			height: 300,
		});

		expect(groups[0]?.d).not.toContain("Z");
	});

	it("drops features entirely outside the viewport", () => {
		const groups = buildPaths({
			features: [
				polygon([
					[9000, 9000],
					[9100, 9000],
					[9100, 9100],
					[9000, 9000],
				]),
			],
			rules: [fillRule],
			bounds,
			width: 400,
			height: 300,
		});

		expect(groups).toEqual([]);
	});

	it("drops degenerate geometry that rounds to a single point", () => {
		const groups = buildPaths({
			features: [
				polygon([
					[150, 150],
					[150.01, 150.01],
					[150.02, 150],
				]),
			],
			rules: [fillRule],
			bounds,
			width: 400,
			height: 300,
		});

		expect(groups).toEqual([]);
	});

	it("orders groups back to front by rule order", () => {
		const groups = buildPaths({
			features: [
				line,
				polygon([
					[150, 150],
					[200, 150],
					[200, 200],
					[150, 150],
				]),
			],
			rules: [fillRule, lineRule],
			bounds,
			width: 400,
			height: 300,
		});

		expect(groups.map((g) => g.rule.order)).toEqual([0, 1]);
	});
});
