import { describe, expect, it } from "vitest";

import { openMapTiles } from "./openmaptiles.js";

import type { FeatureProperties, SourceLayerBinding } from "@stillmap/core";

const schema = openMapTiles();

function matches(
	binding: SourceLayerBinding | undefined,
	properties: FeatureProperties,
): boolean {
	const filter = binding?.filter;

	if (filter === undefined) {
		return true;
	}

	if (typeof filter === "function") {
		return filter(properties);
	}

	return Object.entries(filter).every(([key, expected]) => {
		const actual = properties[key];

		return expected instanceof Array
			? expected.includes(actual as never)
			: expected === actual;
	});
}

describe("openMapTiles", () => {
	it("maps roads onto the transportation layer", () => {
		const [binding] = schema.resolve({
			kind: "road",
			classes: ["motorway", "trunk"],
		});

		expect(binding?.sourceLayer).toBe("transportation");
		expect(binding?.classes).toEqual(["motorway", "trunk"]);
	});

	it("excludes tunnels from every road binding without the caller asking", () => {
		const [binding] = schema.resolve({ kind: "road", classes: ["motorway"] });

		expect(matches(binding, { class: "motorway", brunnel: "bridge" })).toBe(
			true,
		);
		expect(matches(binding, { class: "motorway", brunnel: "tunnel" })).toBe(
			false,
		);
	});

	it("reports only the classes it actually covers", () => {
		const [binding] = schema.resolve({
			kind: "road",
			classes: ["motorway", "not_a_road_class"],
		});

		expect(binding?.classes).toEqual(["motorway"]);
	});

	it("returns nothing when no requested class is known", () => {
		expect(schema.resolve({ kind: "road", classes: ["nonsense"] })).toEqual([]);
	});

	it("translates boundary classes into admin levels", () => {
		const [binding] = schema.resolve({
			kind: "boundary",
			classes: ["country"],
		});

		expect(binding?.sourceLayer).toBe("boundary");
		expect(matches(binding, { admin_level: 2, maritime: 0 })).toBe(true);
		expect(matches(binding, { admin_level: 6, maritime: 0 })).toBe(false);
	});

	it("excludes maritime boundaries", () => {
		const [binding] = schema.resolve({
			kind: "boundary",
			classes: ["country"],
		});

		expect(matches(binding, { admin_level: 2, maritime: 1 })).toBe(false);
	});

	it("excludes swimming pools from water", () => {
		const [binding] = schema.resolve({ kind: "water" });

		expect(matches(binding, { class: "lake" })).toBe(true);
		expect(matches(binding, { class: "swimming_pool" })).toBe(false);
	});

	it("separates rail and path from road, all on the transportation layer", () => {
		expect(schema.resolve({ kind: "rail" })[0]?.sourceLayer).toBe(
			"transportation",
		);
		expect(schema.resolve({ kind: "path" })[0]?.sourceLayer).toBe(
			"transportation",
		);
	});

	it("binds building wholesale, with no class filter", () => {
		const [binding] = schema.resolve({ kind: "building" });

		expect(binding?.sourceLayer).toBe("building");
		expect(binding?.filter).toBeUndefined();
	});

	it("prefers the latin name and rejects unrenderable text", () => {
		expect(
			schema.resolveName({ "name:latin": "Hamburg", name: "Hamburg" }),
		).toBe("Hamburg");
		expect(schema.resolveName({ name: "Кишинёв" })).toBeNull();
		expect(
			schema.resolveName({ "name:latin": "Chisinau", name: "Кишинёв" }),
		).toBe("Chisinau");
	});

	it("honours a requested locale before the latin name", () => {
		expect(
			schema.resolveName(
				{ "name:de": "Muenchen", "name:latin": "Munchen" },
				"de",
			),
		).toBe("Muenchen");
	});

	it("returns an empty name as null", () => {
		expect(schema.resolveName({ name: "" })).toBeNull();
	});

	it("sorts a missing rank last", () => {
		expect(schema.resolveRank({ rank: 3 })).toBe(3);
		expect(schema.resolveRank({})).toBe(100);
	});
});
