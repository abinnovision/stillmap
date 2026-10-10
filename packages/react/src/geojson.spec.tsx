import { createWarningCollector } from "@stillmap/core";
import { describe, expect, it } from "vitest";

import { GeoJson } from "./geojson.js";
import { walk } from "./walk.js";

import type { GeoJsonFeatureCollection } from "@stillmap/core";
import type { ReactNode } from "react";

const data: GeoJsonFeatureCollection = {
	type: "FeatureCollection",
	features: [
		{ type: "Feature", geometry: { type: "Point", coordinates: [10, 53.5] } },
		{
			type: "Feature",
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[9.9, 53.5],
						[10.1, 53.5],
						[10.1, 53.6],
						[9.9, 53.5],
					],
				],
			},
		},
	],
};

function walked(node: ReactNode): ReturnType<typeof walk> {
	return walk(node, createWarningCollector({}));
}

describe("geoJson", () => {
	it("emits a fill, a line, and a pin per point", () => {
		const { layers, markers } = walked(
			<GeoJson data={data} fill="#F2E3C6" stroke="#C9A66B" below="road" />,
		);

		expect(layers).toEqual([
			{
				kind: "fill",
				target: { mode: "data", data },
				below: "road",
				fill: "#F2E3C6",
			},
			{
				kind: "line",
				target: { mode: "data", data },
				below: "road",
				stroke: "#C9A66B",
			},
		]);
		expect(markers.map((m) => m.position)).toEqual([[10, 53.5]]);
	});

	it("draws no pins when pin is false", () => {
		const { layers, markers } = walked(
			<GeoJson data={data} fill="#F2E3C6" pin={false} />,
		);

		expect(layers).toHaveLength(1);
		expect(markers).toEqual([]);
	});
});
