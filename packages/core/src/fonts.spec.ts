import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { StillmapError } from "./errors.js";
import { assertFontCoversLabels, assertFontsExist } from "./fonts.js";

let directory = "";
let realFile = "";

beforeAll(() => {
	/*
	 * A real path with a supported extension. Its bytes are never parsed:
	 * assertFontsExist checks the extension and that the file is readable.
	 */
	directory = mkdtempSync(join(tmpdir(), "stillmap-fonts-"));
	realFile = join(directory, "Stub-Regular.ttf");
	writeFileSync(realFile, "not a real font");
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
