import { describe, expect, it } from "vitest";

import { StillmapError, toPng } from "../src/index.js";

const SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 20 10">' +
	'<rect width="20" height="10" fill="#E1E4E7"/></svg>';

function pngSize(buffer: Buffer): { width: number; height: number } {
	// PNG IHDR: 8 byte signature, 4 byte length, 4 byte type, then width/height.
	return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe("toPng", () => {
	it("rasterises an SVG string to a PNG buffer", async () => {
		const png = await toPng({ svg: SVG, width: 20, fonts: [] });

		expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
		expect(pngSize(png).width).toBe(20);
	});

	it("applies the scale factor to the output dimensions", async () => {
		const png = await toPng({ svg: SVG, width: 20, scale: 3, fonts: [] });

		expect(pngSize(png).width).toBe(60);
	});

	it("rejects a font path that does not exist", async () => {
		await expect(
			toPng({
				svg: SVG,
				width: 20,
				fonts: [{ family: "Inter", file: "/nope/Inter.ttf" }],
			}),
		).rejects.toBeInstanceOf(StillmapError);
	});

	it("refuses to rasterise text with no font, so attribution cannot vanish", async () => {
		const withText =
			'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20">' +
			'<text x="2" y="10">OpenFreeMap</text></svg>';

		await expect(
			toPng({ svg: withText, width: 20, fonts: [] }),
		).rejects.toMatchObject({ code: "FONT_MISSING_FOR_TEXT" });
	});
});
