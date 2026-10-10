import { renderMap } from "@stillmap/react";
import { NEUTRAL } from "@stillmap/styles";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { CityCentre } from "./city-centre.tsx";
import { Locator } from "./locator.tsx";
import { Offices } from "./offices.tsx";
import { PRESET_NAMES, PresetCard } from "./presets.tsx";
import { nearest, POIS, PROPERTY } from "./property-data.ts";
import { Property } from "./property.tsx";
import { createFixtureSource } from "../test/support/fixture-source.ts";

import type { Office } from "./offices.tsx";
import type { LngLat } from "@stillmap/core";

const HAMBURG: LngLat = [9.9937, 53.5511];
const source = createFixtureSource();

const OFFICES: readonly Office[] = [
	{ id: "a", position: [9.98, 53.545] },
	{ id: "b", position: [10.005, 53.558] },
	{ id: "c", position: [9.995, 53.552] },
];

function goldenPath(name: string): string {
	return fileURLToPath(new URL(`../test/golden/${name}.svg`, import.meta.url));
}

/**
 * Rewrites the golden when explicitly asked. The conditional lives here rather
 * than in a test body so the tests stay branch-free.
 */
function maybeUpdate(name: string, svg: string): void {
	if (process.env["UPDATE_GOLDEN"] === "1") {
		writeFileSync(goldenPath(name), svg);
	}
}

function readGolden(name: string): string {
	return readFileSync(goldenPath(name), "utf8");
}

describe("locator", () => {
	it("renders the banner with no schema gaps", async () => {
		const result = await renderMap(
			<Locator position={HAMBURG} source={source} />,
		);

		/*
		 * A schema warning means a binding or a canonical class is wrong, which is
		 * a real defect. LABEL_DROPPED is not: it is the marker reservation and
		 * the collision index doing their job, and a dense city centre will always
		 * produce some.
		 */
		expect(result.warnings.filter((w) => w.code.startsWith("SCHEMA_"))).toEqual(
			[],
		);
		expect(result.width).toBe(1200);
		expect(result.height).toBe(300);
	});

	it("drops only labels, and never the same label twice", async () => {
		const result = await renderMap(
			<Locator position={HAMBURG} source={source} />,
		);
		const dropped = result.warnings
			.filter((w) => w.code === "LABEL_DROPPED")
			.map((w) => w.detail?.["text"]);

		expect(new Set(dropped).size).toBe(dropped.length);
	});

	it("carries attribution, the marker, and place labels", async () => {
		const { svg } = await renderMap(
			<Locator position={HAMBURG} source={source} />,
		);

		expect(svg).toContain("OpenFreeMap");
		expect(svg).toContain(NEUTRAL.chrome.marker);
		expect(svg).toContain("<text");
	});

	it("matches its golden", async () => {
		const { svg } = await renderMap(
			<Locator position={HAMBURG} source={source} />,
		);

		maybeUpdate("locator", svg);

		expect(svg).toBe(readGolden("locator"));
	});
});

describe("offices", () => {
	it("fits every marker inside the canvas", async () => {
		const result = await renderMap(
			<Offices offices={OFFICES} source={source} />,
		);

		expect(
			result.warnings.filter((w) => w.code === "MARKER_OFFSCREEN"),
		).toEqual([]);
		// One circle per office.
		expect(result.svg.match(/<circle/g)).toHaveLength(3);
	});

	it("matches its golden", async () => {
		const { svg } = await renderMap(
			<Offices offices={OFFICES} source={source} />,
		);

		maybeUpdate("offices", svg);

		expect(svg).toBe(readGolden("offices"));
	});
});

describe("city-centre", () => {
	it("paints the polygon below the roads", async () => {
		const { svg } = await renderMap(<CityCentre source={source} />);

		expect(svg.indexOf('fill="#F2E3C6"')).toBeGreaterThan(-1);
		expect(svg.indexOf('fill="#F2E3C6"')).toBeLessThan(
			svg.indexOf('stroke="#FFFFFF"'),
		);
	});

	it("matches its golden", async () => {
		const { svg } = await renderMap(<CityCentre source={source} />);

		maybeUpdate("city-centre", svg);

		expect(svg).toBe(readGolden("city-centre"));
	});
});

describe.each(PRESET_NAMES)("preset %s", (preset) => {
	it("renders with no schema gaps", async () => {
		const result = await renderMap(
			<PresetCard preset={preset} position={HAMBURG} source={source} />,
		);

		expect(result.warnings.filter((w) => w.code.startsWith("SCHEMA_"))).toEqual(
			[],
		);
	});

	it("matches its golden", async () => {
		const { svg } = await renderMap(
			<PresetCard preset={preset} position={HAMBURG} source={source} />,
		);

		maybeUpdate(`preset-${preset}`, svg);

		expect(svg).toBe(readGolden(`preset-${preset}`));
	});
});

describe("property", () => {
	// The fixtures are z13 tiles; the component defaults to z14.
	const element = <Property source={source} zoom={13} />;

	it("renders with no schema or marker warnings", async () => {
		const result = await renderMap(element);

		expect(
			result.warnings.filter(
				(w) => w.code.startsWith("SCHEMA_") || w.code.startsWith("MARKER_"),
			),
		).toEqual([]);
	});

	it("measures the nearest point of interest per category", () => {
		const distances = Object.fromEntries(
			nearest(PROPERTY.position, POIS).map((n) => [n.category, n.distance]),
		);

		// About 104 m east and 19 m north, and 228 m west and 281 m south.
		expect(distances["cafe"]).toBe(100);
		expect(distances["doctor"]).toBe(350);
	});

	it("matches its golden", async () => {
		const { svg } = await renderMap(element);

		maybeUpdate("property", svg);

		expect(svg).toBe(readGolden("property"));
	});
});
