import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { decodeTile } from "./decode.js";

const COORD = { z: 13, column: 4323, y: 2647 };

function fixture(): ArrayBuffer {
	const buffer = readFileSync(
		fileURLToPath(
			new URL(
				"../test/fixtures/openfreemap-z13-4323-2647.mvt",
				import.meta.url,
			),
		),
	);

	return buffer.buffer.slice(
		buffer.byteOffset,
		buffer.byteOffset + buffer.byteLength,
	);
}

describe("decodeTile", () => {
	it("decodes only the requested source layers", () => {
		const features = decodeTile({
			buffer: fixture(),
			coord: COORD,
			tileDisplaySize: 512,
			sourceLayers: ["water"],
		});

		expect(features.length).toBeGreaterThan(0);
		expect(new Set(features.map((f) => f.layer))).toEqual(new Set(["water"]));
	});

	it("returns nothing for a layer the tile does not carry", () => {
		expect(
			decodeTile({
				buffer: fixture(),
				coord: COORD,
				tileDisplaySize: 512,
				sourceLayers: ["not_a_real_layer"],
			}),
		).toEqual([]);
	});

	it("projects geometry into world pixel space at the tile origin", () => {
		const [feature] = decodeTile({
			buffer: fixture(),
			coord: COORD,
			tileDisplaySize: 512,
			sourceLayers: ["water"],
		});

		expect(feature).toBeDefined();

		const originX = COORD.column * 512;
		const originY = COORD.y * 512;
		const point = feature?.geometry[0]?.[0];

		expect(point).toBeDefined();
		/*
		 * Coordinates land inside this tile's square on the world plane. Vector
		 * tile buffers extend slightly past the edge, hence the tolerance.
		 */
		expect(point?.x).toBeGreaterThan(originX - 512);
		expect(point?.x).toBeLessThan(originX + 1024);
		expect(point?.y).toBeGreaterThan(originY - 512);
		expect(point?.y).toBeLessThan(originY + 1024);
	});

	it("scales geometry when the tile is overzoomed", () => {
		const normal = decodeTile({
			buffer: fixture(),
			coord: COORD,
			tileDisplaySize: 512,
			sourceLayers: ["water"],
		});
		const stretched = decodeTile({
			buffer: fixture(),
			coord: COORD,
			tileDisplaySize: 1024,
			sourceLayers: ["water"],
		});

		const a = normal[0]?.geometry[0]?.[0];
		const b = stretched[0]?.geometry[0]?.[0];

		expect(a).toBeDefined();
		expect(b).toBeDefined();
		// Origin doubles with the tile size, and so does the offset within it.
		expect(b?.x).toBeCloseTo((a?.x ?? 0) * 2, 3);
	});

	it("carries feature properties through", () => {
		const places = decodeTile({
			buffer: fixture(),
			coord: COORD,
			tileDisplaySize: 512,
			sourceLayers: ["place"],
		});

		expect(places.length).toBeGreaterThan(0);
		expect(places.some((f) => typeof f.properties["name"] === "string")).toBe(
			true,
		);
	});
});
