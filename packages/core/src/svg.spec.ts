import { describe, expect, it } from "vitest";

import { canvas } from "./geometry.js";
import { escapeXml, serializeScene } from "./svg.js";

import type { Scene } from "./svg.js";

function scene(overrides: Partial<Scene> = {}): Scene {
	return {
		width: 400,
		height: 300,
		scale: 1,
		background: "#F5F5F3",
		paths: [],
		labels: [],
		overlays: [],
		attribution: [{ text: "OpenFreeMap (c) OpenMapTiles" }],
		attributionPlacement: "bottom-right",
		...overrides,
	};
}

describe("escapeXml", () => {
	it("escapes every XML metacharacter", () => {
		expect(escapeXml(`Ben & Jerry's <"tag">`)).toBe(
			"Ben &amp; Jerry&apos;s &lt;&quot;tag&quot;&gt;",
		);
	});
});

describe("serializeScene", () => {
	it("sets root dimensions from scale while the viewBox stays in CSS pixels", () => {
		const svg = serializeScene(scene({ scale: 2 }));

		expect(svg).toContain('width="800"');
		expect(svg).toContain('height="600"');
		expect(svg).toContain('viewBox="0 0 400 300"');
	});

	it("paints the background first", () => {
		const svg = serializeScene(scene());

		expect(svg).toContain('<rect width="400" height="300" fill="#F5F5F3"/>');
	});

	it("emits fill and line rules with their paint properties", () => {
		const svg = serializeScene(
			scene({
				paths: [
					{
						rule: {
							kind: "fill",
							order: 0,
							sourceLayer: "water",
							fill: "#E1E4E7",
							fillOpacity: 1,
						},
						d: "M0 0L10 10Z",
					},
					{
						rule: {
							kind: "line",
							order: 1,
							sourceLayer: "transportation",
							stroke: "#FFFFFF",
							width: 2,
							opacity: 1,
							dash: [4, 3],
						},
						d: "M0 0L10 10",
					},
				],
			}),
		);

		expect(svg).toContain('d="M0 0L10 10Z" fill="#E1E4E7"');
		expect(svg).toContain('stroke="#FFFFFF"');
		expect(svg).toContain('stroke-width="2"');
		expect(svg).toContain('stroke-dasharray="4 3"');
		expect(svg).toContain('fill="none"');
	});

	it("draws labels above geometry, with the halo behind the fill", () => {
		const svg = serializeScene(
			scene({
				paths: [
					{
						rule: {
							kind: "fill",
							order: 0,
							sourceLayer: "water",
							fill: "#E1E4E7",
							fillOpacity: 1,
						},
						d: "M0 0L10 10Z",
					},
				],
				labels: [
					{
						text: "Hamburg",
						anchor: canvas(200, 150),
						priority: 0,
						rank: 1,
						fontSize: 15,
						fontWeight: 600,
						letterSpacing: 0.3,
						fontFamily: "Inter",
						color: "#6E6E68",
						halo: "#F5F5F3",
						haloWidth: 3,
						maxCount: 10,
						element: 0,
						align: "middle",
						lines: ["Hamburg"],
						lineHeight: 18,
						box: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
					},
				],
			}),
		);

		expect(svg.indexOf("Hamburg")).toBeGreaterThan(svg.indexOf("M0 0L10 10Z"));
		expect(svg).toContain('paint-order="stroke"');
		expect(svg).toContain('stroke="#F5F5F3"');
		expect(svg).toContain('font-family="Inter"');
	});

	it("splices overlay markup last, translated to its canvas position", () => {
		const svg = serializeScene(
			scene({ overlays: [{ markup: '<path d="M0 0"/>', x: 100.5, y: 42 }] }),
		);

		expect(svg).toContain(
			'<g transform="translate(100.5 42)"><path d="M0 0"/></g>',
		);
	});

	it("always emits attribution, escaping its text", () => {
		const svg = serializeScene(
			scene({ attribution: [{ text: "A & B" }, { text: "C" }] }),
		);

		expect(svg).toContain("A &amp; B");
		expect(svg).toContain("C");
	});

	it("emits attribution even when the list is the only content", () => {
		expect(serializeScene(scene())).toContain("OpenFreeMap");
	});
});
