import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import opentype from "opentype.js";
import { beforeAll, describe, expect, it } from "vitest";

import {
	estimateMeasurer,
	estimateTextWidth,
	loadTextMeasurer,
} from "./metrics.js";
import { createWarningCollector } from "./warnings.js";

/**
 * A three-glyph font built in memory, so the expected advances are exact and
 * no binary fixture has to live in the repository.
 */
function buildFont(dir: string): string {
	const O = opentype as unknown as {
		Font: new (options: object) => { toArrayBuffer: () => ArrayBuffer };
		Glyph: new (options: object) => object;
		Path: new () => object;
	};
	const glyphs = [
		new O.Glyph({
			name: ".notdef",
			unicode: 0,
			advanceWidth: 500,
			path: new O.Path(),
		}),
		new O.Glyph({
			name: "A",
			unicode: 65,
			advanceWidth: 600,
			path: new O.Path(),
		}),
		new O.Glyph({
			name: "B",
			unicode: 66,
			advanceWidth: 700,
			path: new O.Path(),
		}),
	];
	const font = new O.Font({
		familyName: "Fixture",
		styleName: "Regular",
		unitsPerEm: 1000,
		ascender: 800,
		descender: -200,
		glyphs,
	});
	const file = join(dir, "fixture.ttf");

	writeFileSync(file, Buffer.from(font.toArrayBuffer()));

	return file;
}

let fontFile = "";

beforeAll(() => {
	fontFile = buildFont(mkdtempSync(join(tmpdir(), "stillmap-metrics-")));
});

const STYLE = {
	fontFamily: "Fixture",
	fontWeight: 400,
	fontSize: 10,
	letterSpacing: 0,
};

describe("loadTextMeasurer", () => {
	it("measures with the font's real advance widths", async () => {
		const measure = await loadTextMeasurer(
			[{ family: "Fixture", file: fontFile }],
			createWarningCollector({}),
		);
		const measured = measure("AB", STYLE);

		// (600 + 700) / 1000 units per em * 10px.
		expect(measured.width).toBeCloseTo(13, 5);
		expect(measured.ascent).toBeCloseTo(8, 5);
		expect(measured.descent).toBeCloseTo(2, 5);
	});

	it("adds letter spacing between glyphs", async () => {
		const measure = await loadTextMeasurer(
			[{ family: "Fixture", file: fontFile }],
			createWarningCollector({}),
		);

		expect(measure("AB", { ...STYLE, letterSpacing: 2 }).width).toBeCloseTo(
			15,
			5,
		);
	});

	it("falls back to the estimate for an unknown family", async () => {
		const measure = await loadTextMeasurer(
			[{ family: "Fixture", file: fontFile }],
			createWarningCollector({}),
		);
		const style = { ...STYLE, fontFamily: "Nowhere" };

		expect(measure("AB", style)).toEqual(estimateMeasurer("AB", style));
	});

	it("warns once and degrades to the estimate for an unparseable file", async () => {
		const dir = mkdtempSync(join(tmpdir(), "stillmap-metrics-bad-"));
		const bad = join(dir, "bad.ttf");

		writeFileSync(bad, "not a real font");

		const warn = createWarningCollector({});
		const measure = await loadTextMeasurer(
			[{ family: "Broken", file: bad }],
			warn,
		);

		expect(warn.warnings.map((w) => w.code)).toEqual([
			"FONT_METRICS_UNAVAILABLE",
		]);
		expect(measure("AB", { ...STYLE, fontFamily: "Broken" })).toEqual(
			estimateMeasurer("AB", { ...STYLE, fontFamily: "Broken" }),
		);
	});

	it("chooses the face whose weight sits nearest the request", async () => {
		const measure = await loadTextMeasurer(
			[
				{ family: "Fixture", file: fontFile, weight: 400 },
				{ family: "Fixture", file: fontFile, weight: 700 },
			],
			createWarningCollector({}),
		);

		// Same file either way; the point is that resolution does not throw.
		expect(measure("A", { ...STYLE, fontWeight: 600 }).width).toBeCloseTo(6, 5);
	});
});

describe("estimateTextWidth", () => {
	it("scales with character count and font size", () => {
		const short = estimateTextWidth("Ulm", 15, 0);
		const long = estimateTextWidth("Hamburg", 15, 0);

		expect(long).toBeGreaterThan(short);
		expect(estimateTextWidth("Ulm", 30, 0)).toBeCloseTo(short * 2, 6);
	});

	it("adds letter spacing per character", () => {
		expect(estimateTextWidth("abc", 10, 1)).toBeCloseTo(
			estimateTextWidth("abc", 10, 0) + 3,
			6,
		);
	});
});
