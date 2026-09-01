import { describe, expect, it } from "vitest";

import { resolveRule, resolveStyle } from "./style.js";
import { createWarningCollector } from "./warnings.js";

import type { LayerDeclaration } from "./declaration.js";
import type { TileSchema } from "./source.js";

const schema: TileSchema = {
	id: "openmaptiles",
	resolve: (query) => {
		if (query.kind === "water") {
			return [{ sourceLayer: "water" }];
		}

		if (query.kind === "road") {
			const known = ["motorway", "trunk", "minor"];
			const wanted = (query.classes ?? known).filter((c) => known.includes(c));

			return wanted.length === 0
				? []
				: [
						{
							sourceLayer: "transportation",
							filter: {
								class: wanted,
								brunnel: ["bridge", "ford"],
							},
							classes: wanted,
						},
					];
		}

		return [];
	},
	resolveName: () => null,
	resolveRank: () => 100,
};

const warn = (): ReturnType<typeof createWarningCollector> =>
	createWarningCollector({});

describe("resolveStyle", () => {
	it("resolves a canonical layer through the schema", () => {
		const declarations: LayerDeclaration[] = [
			{
				kind: "fill",
				target: { mode: "canonical", kind: "water" },
				fill: "#E1E4E7",
			},
		];
		const { rules, sourceLayers } = resolveStyle({
			declarations,
			schema,
			zoom: 13,
			warn: warn(),
		});

		expect(sourceLayers).toEqual(["water"]);
		expect(rules).toHaveLength(1);
		expect(rules[0]).toMatchObject({
			kind: "fill",
			sourceLayer: "water",
			fill: "#E1E4E7",
		});
	});

	it("collapses a zoom function to a literal at the render zoom", () => {
		const { rules } = resolveStyle({
			declarations: [
				{
					kind: "line",
					target: { mode: "canonical", kind: "road", classes: ["motorway"] },
					stroke: "#FCFBF9",
					width: (zoom) => (zoom < 13 ? 2.2 : 3.2),
				},
			],
			schema,
			zoom: 15,
			warn: warn(),
		});

		expect(rules[0]).toMatchObject({ kind: "line", width: 3.2 });
	});

	it("drops layers outside their zoom range", () => {
		const { rules } = resolveStyle({
			declarations: [
				{
					kind: "fill",
					target: { mode: "canonical", kind: "water" },
					fill: "#fff",
					minZoom: 14,
				},
			],
			schema,
			zoom: 13,
			warn: warn(),
		});

		expect(rules).toEqual([]);
	});

	it("warns when the schema has no binding for a kind", () => {
		const collector = warn();

		resolveStyle({
			declarations: [
				{
					kind: "fill",
					target: { mode: "canonical", kind: "park" },
					fill: "#fff",
				},
			],
			schema,
			zoom: 13,
			warn: collector,
		});

		expect(collector.warnings.map((w) => w.code)).toEqual([
			"SCHEMA_KIND_UNSUPPORTED",
		]);
	});

	it("warns for each requested class the schema does not map", () => {
		const collector = warn();

		resolveStyle({
			declarations: [
				{
					kind: "line",
					target: {
						mode: "canonical",
						kind: "road",
						classes: ["motorway", "motorwya"],
					},
					stroke: "#fff",
				},
			],
			schema,
			zoom: 13,
			warn: collector,
		});

		expect(collector.warnings).toHaveLength(1);
		expect(collector.warnings[0]?.code).toBe("SCHEMA_CLASS_UNMAPPED");
		expect(collector.warnings[0]?.detail).toMatchObject({
			classes: ["motorwya"],
		});
	});

	it("passes a raw layer through without consulting the schema", () => {
		const collector = warn();
		const { rules, sourceLayers } = resolveStyle({
			declarations: [
				{
					kind: "fill",
					target: { mode: "raw", sourceLayer: "landuse" },
					filter: { class: "cemetery" },
					fill: "#E9EBE6",
				},
			],
			schema,
			zoom: 13,
			warn: collector,
		});

		expect(sourceLayers).toEqual(["landuse"]);
		expect(rules[0]).toMatchObject({ sourceLayer: "landuse" });
		expect(collector.warnings).toEqual([]);
	});

	it("preserves declaration order as paint order", () => {
		const { rules } = resolveStyle({
			declarations: [
				{
					kind: "fill",
					target: { mode: "canonical", kind: "water" },
					fill: "#a",
				},
				{
					kind: "line",
					target: { mode: "canonical", kind: "road" },
					stroke: "#b",
				},
			],
			schema,
			zoom: 13,
			warn: warn(),
		});

		expect(rules.map((r) => r.order)).toEqual([0, 1]);
	});

	it("intersects the schema binding filter with the declaration filter", () => {
		const { rules } = resolveStyle({
			declarations: [
				{
					kind: "line",
					target: { mode: "canonical", kind: "road", classes: ["motorway"] },
					filter: { brunnel: "bridge" },
					stroke: "#fff",
				},
			],
			schema,
			zoom: 13,
			warn: warn(),
		});

		const bridge = {
			layer: "transportation",
			properties: { class: "motorway", brunnel: "bridge" },
		};
		const ford = {
			layer: "transportation",
			properties: { class: "motorway", brunnel: "ford" },
		};

		expect(resolveRule(bridge, rules)).toBe(rules[0]);
		expect(resolveRule(ford, rules)).toBeNull();
	});
});

describe("resolveRule", () => {
	it("returns the first matching rule and null when none match", () => {
		const { rules } = resolveStyle({
			declarations: [
				{
					kind: "line",
					target: { mode: "canonical", kind: "road", classes: ["motorway"] },
					stroke: "#FCFBF9",
					width: 3.2,
				},
			],
			schema,
			zoom: 13,
			warn: warn(),
		});

		const matching = {
			layer: "transportation",
			properties: { class: "motorway", brunnel: "bridge" },
		};
		const other = {
			layer: "transportation",
			properties: { class: "minor", brunnel: "bridge" },
		};

		expect(resolveRule(matching, rules)).toBe(rules[0]);
		expect(resolveRule(other, rules)).toBeNull();
	});
});
