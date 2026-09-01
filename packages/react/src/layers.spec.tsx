import { createWarningCollector } from "@stillmap/core";
import { describe, expect, it } from "vitest";

import { Building, Fill, Line, Road, Water } from "./layers.js";
import { walk } from "./walk.js";

import type { LayerDeclaration } from "@stillmap/core";
import type { ReactNode } from "react";

function layers(node: ReactNode): readonly LayerDeclaration[] {
	return walk(node, createWarningCollector({})).layers;
}

describe("canonical layer components", () => {
	it("addresses features through the schema", () => {
		expect(layers(<Water fill="#E1E4E7" />)[0]).toEqual({
			kind: "fill",
			target: { mode: "canonical", kind: "water" },
			fill: "#E1E4E7",
		});
	});

	it("accepts a bare class string", () => {
		expect(
			layers(<Road classes="motorway" stroke="#fff" />)[0]?.target,
		).toEqual({ mode: "canonical", kind: "road", classes: ["motorway"] });
	});

	it("accepts an array of classes", () => {
		expect(
			layers(<Road classes={["motorway", "trunk"]} stroke="#fff" />)[0]?.target,
		).toEqual({
			mode: "canonical",
			kind: "road",
			classes: ["motorway", "trunk"],
		});
	});

	it("carries a zoom function through untouched", () => {
		const width = (zoom: number): number => (zoom < 13 ? 2.2 : 3.2);

		expect(layers(<Road stroke="#fff" width={width} />)[0]?.width).toBe(width);
	});

	it("omits absent optional props rather than setting them undefined", () => {
		const declaration = layers(<Water fill="#fff" />)[0];

		expect(declaration).not.toHaveProperty("minZoom");
		expect(declaration).not.toHaveProperty("stroke");
	});

	it("keeps a declaration filter alongside the canonical target", () => {
		const filter = { class: "lake" };

		expect(layers(<Water fill="#fff" filter={filter} />)[0]?.filter).toBe(
			filter,
		);
	});

	it("passes zoom bounds through", () => {
		expect(
			layers(<Water fill="#fff" minZoom={10} maxZoom={16} />)[0],
		).toMatchObject({ minZoom: 10, maxZoom: 16 });
	});

	it("emits a fill declaration for fill-only kinds", () => {
		expect(layers(<Building fill="#E8E7E4" />)[0]?.kind).toBe("fill");
	});
});

describe("raw layer components", () => {
	it("bypasses the schema entirely", () => {
		expect(
			layers(
				<Fill layer="landuse" filter={{ class: "cemetery" }} fill="#E9EBE6" />,
			)[0],
		).toEqual({
			kind: "fill",
			target: { mode: "raw", sourceLayer: "landuse" },
			filter: { class: "cemetery" },
			fill: "#E9EBE6",
		});
	});

	it("emits a line declaration for Line", () => {
		expect(
			layers(<Line layer="transportation" stroke="#fff" width={2} />)[0],
		).toMatchObject({
			kind: "line",
			target: { mode: "raw", sourceLayer: "transportation" },
			width: 2,
		});
	});
});
