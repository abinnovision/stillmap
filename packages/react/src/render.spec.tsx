import { describe, expect, it } from "vitest";

import { Water } from "./layers.js";
import { Map } from "./map.js";
import { Pin } from "./marker.js";
import { renderMap } from "./render.js";
import { createFixtureSource } from "../test/support/fixture-source.js";

import type { ReactElement, ReactNode } from "react";

const source = createFixtureSource();

function basicMap(children?: ReactNode): ReactElement {
	return (
		<Map
			source={source}
			center={[9.9937, 53.5511]}
			zoom={13}
			width={1200}
			height={300}
			background="#F5F5F3"
		>
			<Water fill="#E1E4E7" />
			{children}
		</Map>
	);
}

describe("renderMap", () => {
	it("renders a JSX map to an SVG string", async () => {
		const result = await renderMap(basicMap());

		expect(result.svg.startsWith("<svg")).toBe(true);
		expect(result.svg).toContain('fill="#E1E4E7"');
		expect(result.width).toBe(1200);
		expect(result.height).toBe(300);
	});

	it("accepts a user component that resolves to a Map", async () => {
		const Locator = (): ReactNode => basicMap();
		const result = await renderMap(<Locator />);

		expect(result.svg.startsWith("<svg")).toBe(true);
	});

	it("throws when the tree contains no Map", async () => {
		await expect(renderMap(<Water fill="#fff" />)).rejects.toThrow(/no <Map>/);
	});

	it("places markers and always emits attribution", async () => {
		const result = await renderMap(
			basicMap(<Pin position={[9.9937, 53.5511]} fill="#9DB59D" />),
		);

		expect(result.svg).toContain("#9DB59D");
		expect(result.svg).toContain("OpenFreeMap");
	});

	it("derives the viewport from markers when asked to fit", async () => {
		const result = await renderMap(
			<Map source={source} fit="markers" padding={40} width={800} height={600}>
				<Water fill="#E1E4E7" />
				<Pin position={[9.98, 53.54]} />
				<Pin position={[10.01, 53.56]} />
			</Map>,
		);

		expect(result.svg.startsWith("<svg")).toBe(true);
		expect(
			result.warnings.filter((w) => w.code === "MARKER_OFFSCREEN"),
		).toEqual([]);
	});

	it("surfaces warnings instead of failing", async () => {
		const result = await renderMap(basicMap(<Pin position={[-120, 40]} />));

		expect(result.warnings.map((w) => w.code)).toContain("MARKER_OFFSCREEN");
	});

	it("reports each warning exactly once", async () => {
		const result = await renderMap(basicMap(<Pin position={[-120, 40]} />));

		expect(
			result.warnings.filter((w) => w.code === "MARKER_OFFSCREEN"),
		).toHaveLength(1);
	});

	it("throws every warning in strict mode", async () => {
		await expect(
			renderMap(basicMap(<Pin position={[-120, 40]} />), { strict: true }),
		).rejects.toThrow();
	});

	it("scales the SVG root while the viewBox stays in CSS pixels", async () => {
		const result = await renderMap(basicMap(), { scale: 2 });

		expect(result.svg).toContain('width="2400"');
		expect(result.svg).toContain('viewBox="0 0 1200 300"');
	});
});
