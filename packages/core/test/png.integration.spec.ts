import { renderAsync } from "@resvg/resvg-js";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { StillmapError, toPng } from "../src/index.js";

const SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 20 10">' +
	'<rect width="20" height="10" fill="#E1E4E7"/></svg>';

function pngSize(buffer: Buffer): { width: number; height: number } {
	// PNG IHDR: 8 byte signature, 4 byte length, 4 byte type, then width/height.
	return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** Inflates the IDAT chunks and strips each row's filter byte. */
function pngPixels(buffer: Buffer): Buffer {
	const { width } = pngSize(buffer);
	const idat: Buffer[] = [];

	for (let at = 8; at < buffer.length;) {
		const length = buffer.readUInt32BE(at);

		if (buffer.toString("ascii", at + 4, at + 8) === "IDAT") {
			idat.push(buffer.subarray(at + 8, at + 8 + length));
		}

		at += 12 + length;
	}

	const raw = inflateSync(Buffer.concat(idat));
	const stride = width * 4 + 1;
	const rows: Buffer[] = [];

	for (let at = 0; at < raw.length; at += stride) {
		rows.push(raw.subarray(at + 1, at + stride));
	}

	return Buffer.concat(rows);
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

	it("encodes exactly the pixels resvg rasterised", async () => {
		const png = await toPng({ svg: SVG, width: 20, fonts: [] });
		const image = await renderAsync(SVG, {
			fitTo: { mode: "width", value: 20 },
			font: { loadSystemFonts: false },
		});

		// The SVG is opaque, so resvg's premultiplied pixels are already straight.
		expect(pngPixels(png).equals(image.pixels)).toBe(true);
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
