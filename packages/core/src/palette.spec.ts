import { describe, expect, it } from "vitest";

import { mergePalette } from "./palette.js";

import type { Palette, PaletteOverride } from "./palette.js";

const BASE: Palette = {
	name: "base",
	geometry: {
		landcover: "#010101",
		park: "#020202",
		water: "#030303",
		waterway: "#040404",
		building: "#050505",
		boundary: "#060606",
		rail: "#070707",
		path: "#080808",
		road: "#090909",
		roadCasing: "#0A0A0A",
		motorway: "#0B0B0B",
	},
	label: {
		primary: "#101010",
		secondary: "#111111",
		tertiary: "#121212",
		halo: "#131313",
	},
	chrome: {
		background: "#202020",
		marker: "#212121",
		markerStroke: "#222222",
	},
};

describe("mergePalette", () => {
	it("returns the base itself when there is nothing to merge", () => {
		expect(mergePalette(BASE)).toBe(BASE);
		expect(mergePalette(BASE, {})).toEqual(BASE);
	});

	it("replaces only the named keys of a group", () => {
		const merged = mergePalette(BASE, { geometry: { water: "#FFFFFF" } });

		expect(merged.geometry.water).toBe("#FFFFFF");
		expect(merged.geometry.road).toBe(BASE.geometry.road);
		expect(merged.label).toEqual(BASE.label);
	});

	it("treats an explicit undefined as absent", () => {
		/*
		 * `exactOptionalPropertyTypes` makes this unreachable from TypeScript, but
		 * the published JavaScript has untyped callers too, and a spread that
		 * carries an absent key through arrives here as exactly this.
		 */
		const merged = mergePalette(BASE, {
			geometry: { water: undefined },
			name: undefined,
		} as unknown as PaletteOverride);

		expect(merged.geometry.water).toBe(BASE.geometry.water);
		expect(merged.name).toBe("base");
	});

	it("merges every group independently", () => {
		const merged = mergePalette(BASE, {
			name: "recoloured",
			label: { halo: "#FFFFFF" },
			chrome: { marker: "#FF0000" },
		});

		expect(merged.name).toBe("recoloured");
		expect(merged.label.halo).toBe("#FFFFFF");
		expect(merged.label.primary).toBe(BASE.label.primary);
		expect(merged.chrome.marker).toBe("#FF0000");
		expect(merged.chrome.background).toBe(BASE.chrome.background);
	});

	it("does not mutate the base", () => {
		mergePalette(BASE, { geometry: { water: "#FFFFFF" } });

		expect(BASE.geometry.water).toBe("#030303");
	});
});
