import { createWarningCollector } from "@stillmap/core";
import { describe, expect, it } from "vitest";

import { Attribution } from "./attribution.js";
import { Water } from "./layers.js";
import { Map } from "./map.js";
import { walk } from "./walk.js";

import type { TileSource } from "@stillmap/core";

const source: TileSource = {
	id: "stub",
	schema: {
		id: "stub",
		resolve: () => [],
		resolveName: () => null,
		resolveRank: () => 0,
	},
	attribution: [{ text: "Stub" }],
	open: () =>
		Promise.resolve({
			minZoom: 0,
			maxZoom: 14,
			version: "v",
			fetchTile: () => Promise.resolve(null),
		}),
};

describe("map", () => {
	it("captures its own props and walks its children", () => {
		const walked = walk(
			<Map
				source={source}
				center={[9.9937, 53.5511]}
				zoom={13}
				width={1200}
				height={300}
			>
				<Water fill="#E1E4E7" />
			</Map>,
			createWarningCollector({}),
		);

		expect(walked.map).toMatchObject({ zoom: 13, width: 1200, height: 300 });
		expect(walked.layers).toHaveLength(1);
	});

	it("ignores a nested Map and warns", () => {
		const warn = createWarningCollector({});

		walk(
			<Map source={source} center={[0, 0]} zoom={1} width={10} height={10}>
				<Map source={source} center={[0, 0]} zoom={1} width={10} height={10} />
			</Map>,
			warn,
		);

		expect(warn.warnings.map((w) => w.code)).toEqual(["UNKNOWN_ELEMENT"]);
	});
});

describe("attribution", () => {
	it("emits a placement declaration", () => {
		const walked = walk(
			<Attribution placement="bottom-left" />,
			createWarningCollector({}),
		);

		expect(walked.attribution).toEqual({
			kind: "attribution",
			placement: "bottom-left",
		});
	});
});
