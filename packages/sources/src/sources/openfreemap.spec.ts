import { describe, expect, it, vi } from "vitest";

import { openFreeMap } from "./openfreemap.js";

describe("openFreeMap", () => {
	it("composes OpenFreeMap tiles with the OpenMapTiles schema", () => {
		const source = openFreeMap();

		expect(source.id).toBe("openfreemap");
		expect(source.schema.id).toBe("openmaptiles");
	});

	it("carries the attribution its licence requires", () => {
		const texts = openFreeMap()
			.attribution.map((a) => a.text)
			.join(" ");

		expect(texts).toContain("OpenFreeMap");
		expect(texts).toContain("OpenMapTiles");
		expect(texts).toContain("OpenStreetMap");
	});

	it("resolves its tile template from the planet TileJSON endpoint", async () => {
		const fetchMock = vi.fn(() =>
			Promise.resolve(
				new Response(
					JSON.stringify({
						tiles: [
							"https://tiles.openfreemap.org/planet/20260901/{z}/{x}/{y}.pbf",
						],
						minzoom: 0,
						maxzoom: 14,
					}),
					{ status: 200 },
				),
			),
		);

		const opened = await openFreeMap().open({
			signal: new AbortController().signal,
			fetch: fetchMock,
		});

		expect(fetchMock).toHaveBeenCalledWith(
			"https://tiles.openfreemap.org/planet",
			expect.anything(),
		);
		expect(opened.maxZoom).toBe(14);
		expect(opened.version).toContain("20260901");
	});
});
