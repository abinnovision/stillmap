import { describe, expect, it } from "vitest";

import { matchesFilter } from "./filter.js";

const motorway = { class: "motorway", brunnel: "bridge", admin_level: 2 };

describe("matchesFilter", () => {
	it("matches everything when no filter is given", () => {
		expect(matchesFilter(undefined, motorway)).toBe(true);
	});

	it("requires every key of an object filter to match", () => {
		expect(matchesFilter({ class: "motorway" }, motorway)).toBe(true);
		expect(
			matchesFilter({ class: "motorway", brunnel: "tunnel" }, motorway),
		).toBe(false);
	});

	it("treats an array value as any-of", () => {
		expect(matchesFilter({ class: ["motorway", "trunk"] }, motorway)).toBe(
			true,
		);
		expect(matchesFilter({ class: ["minor", "service"] }, motorway)).toBe(
			false,
		);
	});

	it("compares numbers and booleans without coercion", () => {
		expect(matchesFilter({ admin_level: 2 }, motorway)).toBe(true);
		expect(matchesFilter({ admin_level: "2" }, motorway)).toBe(false);
	});

	it("fails a key the feature does not carry", () => {
		expect(matchesFilter({ missing: "value" }, motorway)).toBe(false);
	});

	it("delegates to a predicate filter", () => {
		expect(matchesFilter((p) => Number(p["admin_level"]) <= 4, motorway)).toBe(
			true,
		);
	});
});
