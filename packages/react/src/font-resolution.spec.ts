import { StillmapError, assertFontsExist } from "@stillmap/core";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function captureError(run: () => void): unknown {
	try {
		run();
	} catch (error) {
		return error;
	}

	return null;
}

describe("font resolution diagnostics", () => {
	it("names the resolved path, not the authored expression", () => {
		/*
		 * Under a bundler the path that was written and the path that was
		 * resolved differ. Printing the resolved value is the only way to see
		 * that in seconds rather than hours.
		 */
		const resolved = fileURLToPath(
			new URL("./nope/Inter-Medium.ttf", import.meta.url),
		);
		const error = captureError(() => {
			assertFontsExist([{ family: "Inter", weight: 500, file: resolved }]);
		});

		expect(error).toBeInstanceOf(StillmapError);
		expect((error as StillmapError).message).toContain(resolved);
		expect((error as StillmapError).detail).toMatchObject({ file: resolved });
	});

	it("reports the family alongside the path", () => {
		const error = captureError(() => {
			assertFontsExist([{ family: "Inter", file: "/nope.ttf" }]);
		});

		expect((error as StillmapError).detail).toMatchObject({ family: "Inter" });
	});

	it("rejects a web font before it can render blank", () => {
		const error = captureError(() => {
			assertFontsExist([{ family: "Inter", file: "/fonts/inter.woff2" }]);
		});

		expect((error as StillmapError).code).toBe("FONT_FORMAT_UNSUPPORTED");
	});
});
