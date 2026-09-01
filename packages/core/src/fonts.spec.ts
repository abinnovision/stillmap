import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { StillmapError } from "./errors.js";
import {
	assertFontCoversLabels,
	assertFontsExist,
	loadEmbeddableFonts,
} from "./fonts.js";
import { createWarningCollector } from "./warnings.js";

let directory = "";
let realFile = "";
let collectionFile = "";

beforeAll(() => {
	/*
	 * A real path with a supported extension. Its bytes are never parsed:
	 * assertFontsExist checks the extension and that the file is readable.
	 */
	directory = mkdtempSync(join(tmpdir(), "stillmap-fonts-"));
	realFile = join(directory, "Stub-Regular.ttf");
	writeFileSync(realFile, "not a real font");
	collectionFile = join(directory, "Stub.ttc");
	writeFileSync(collectionFile, "not a real collection");
});

afterAll(() => {
	rmSync(directory, { recursive: true, force: true });
});

/**
 * Returns whatever `run` threw, so assertions stay at the top level of the
 * test. Asserting inside a `catch` is a conditional expect: if the call stops
 * throwing, the block never runs and the test passes for the wrong reason.
 */
function captureError(run: () => void): unknown {
	try {
		run();
	} catch (error) {
		return error;
	}

	return null;
}

describe("assertFontsExist", () => {
	it("accepts a readable file", () => {
		expect(() => {
			assertFontsExist([{ family: "Inter", weight: 500, file: realFile }]);
		}).not.toThrow();
	});

	it("throws FONT_NOT_FOUND naming the path and family", () => {
		const error = captureError(() => {
			assertFontsExist([{ family: "Inter", file: "/nope/Inter-Medium.ttf" }]);
		});

		expect(error).toBeInstanceOf(StillmapError);
		expect((error as StillmapError).code).toBe("FONT_NOT_FOUND");
		expect((error as StillmapError).message).toContain(
			"/nope/Inter-Medium.ttf",
		);
		expect((error as StillmapError).detail).toMatchObject({
			family: "Inter",
			file: "/nope/Inter-Medium.ttf",
		});
	});
});

describe("assertFontsExist font formats", () => {
	it("rejects a web font format that would silently render nothing", () => {
		const error = captureError(() => {
			assertFontsExist([{ family: "Inter", file: "/tmp/inter.woff2" }]);
		});

		expect(error).toBeInstanceOf(StillmapError);
		expect((error as StillmapError).code).toBe("FONT_FORMAT_UNSUPPORTED");
	});

	it("accepts ttf, otf and ttc, failing only on absence", () => {
		const codes = [".ttf", ".otf", ".ttc"].map((ext) => {
			const error = captureError(() => {
				assertFontsExist([{ family: "Inter", file: `/nope/Inter${ext}` }]);
			});

			return (error as StillmapError).code;
		});

		expect(codes).toEqual([
			"FONT_NOT_FOUND",
			"FONT_NOT_FOUND",
			"FONT_NOT_FOUND",
		]);
	});
});

describe("assertFontCoversLabels", () => {
	it("throws when labels are declared and no font is given", () => {
		expect(() => {
			assertFontCoversLabels([], ["Inter"]);
		}).toThrow(StillmapError);
	});

	it("throws when the required family is missing", () => {
		expect(() => {
			assertFontCoversLabels([{ family: "Roboto", file: realFile }], ["Inter"]);
		}).toThrow(/Inter/);
	});

	it("passes when every required family is present", () => {
		expect(() => {
			assertFontCoversLabels([{ family: "Inter", file: realFile }], ["Inter"]);
		}).not.toThrow();
	});

	it("passes when nothing needs a font", () => {
		expect(() => {
			assertFontCoversLabels([], []);
		}).not.toThrow();
	});
});

describe("loadEmbeddableFonts", () => {
	it("reads a face into a data uri, carrying weight and style", async () => {
		const warn = createWarningCollector({});
		const [font] = await loadEmbeddableFonts(
			[{ family: "Stub", file: realFile, weight: 600, style: "italic" }],
			warn,
		);

		expect(font).toMatchObject({
			family: "Stub",
			format: "truetype",
			weight: 600,
			style: "italic",
		});
		expect(font?.source).toBe(
			`data:font/ttf;base64,${Buffer.from("not a real font").toString("base64")}`,
		);
		expect(warn.warnings).toHaveLength(0);
	});

	it("skips a font collection and says why", async () => {
		const warn = createWarningCollector({});
		const fonts = await loadEmbeddableFonts(
			[{ family: "Stub", file: collectionFile }],
			warn,
		);

		expect(fonts).toHaveLength(0);
		expect(warn.warnings[0]).toMatchObject({ code: "FONT_NOT_EMBEDDABLE" });
	});
});
