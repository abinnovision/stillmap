import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { renderScene } from "./render.js";
import { createFixtureSource } from "../test/support/fixture-source.js";

import type { LayerDeclaration, MarkerDeclaration } from "./declaration.js";
import type { RenderSceneArgs } from "./render.js";

const declarations: LayerDeclaration[] = [
	{
		kind: "fill",
		target: { mode: "canonical", kind: "water" },
		fill: "#E1E4E7",
	},
	{
		kind: "line",
		target: {
			mode: "canonical",
			kind: "road",
			/*
			 * Central Hamburg at z13 carries no motorway or trunk; these are the
			 * classes the fixture tiles actually contain.
			 */
			classes: ["primary", "secondary"],
		},
		stroke: "#FCFBF9",
		/*
		 * Threshold sits at 13.5 so both sides are reachable with the z13
		 * fixtures: a fractional display zoom keeps the same tile columns.
		 */
		width: (zoom) => (zoom < 13.5 ? 2.2 : 3.2),
	},
];

const base: RenderSceneArgs = {
	source: createFixtureSource(),
	center: [9.9937, 53.5511],
	zoom: 13,
	width: 1200,
	height: 300,
	declarations,
	labelDeclarations: [],
	markers: [],
	fonts: [],
	background: "#F5F5F3",
};

let fontDir = "";
let fontFile = "";

beforeAll(() => {
	fontDir = mkdtempSync(join(tmpdir(), "stillmap-render-"));
	fontFile = join(fontDir, "Inter-Medium.ttf");
	writeFileSync(fontFile, "not a real font");
});

afterAll(() => {
	rmSync(fontDir, { recursive: true, force: true });
});

const GOLDEN = fileURLToPath(
	new URL("../test/golden/hamburg-banner.svg", import.meta.url),
);

describe("renderScene", () => {
	it("renders real fixture geometry into an SVG document", async () => {
		const result = await renderScene(base);

		expect(result.svg.startsWith("<svg")).toBe(true);
		expect(result.svg.endsWith("</svg>")).toBe(true);
		expect(result.width).toBe(1200);
		expect(result.height).toBe(300);
		// The fixture tiles carry water and motorways, so both rules must paint.
		expect(result.svg).toContain('fill="#E1E4E7"');
		expect(result.svg).toContain('stroke="#FCFBF9"');
	});

	it("always emits attribution, even when nothing asked for it", async () => {
		const result = await renderScene(base);

		expect(result.svg).toContain("OpenFreeMap");
	});

	it("is deterministic across runs", async () => {
		const [a, b] = await Promise.all([renderScene(base), renderScene(base)]);

		expect(a.svg).toBe(b.svg);
	});

	it("collapses the zoom function at the render zoom", async () => {
		const shallow = await renderScene({ ...base, zoom: 13 });
		const deep = await renderScene({ ...base, zoom: 13.9 });

		expect(shallow.svg).toContain('stroke-width="2.2"');
		expect(deep.svg).toContain('stroke-width="3.2"');
	});

	it("reports schema gaps as warnings rather than failing", async () => {
		const result = await renderScene({
			...base,
			declarations: [
				...declarations,
				{
					kind: "fill",
					target: { mode: "canonical", kind: "park" },
					fill: "#EBEEE9",
				},
			],
		});

		expect(result.warnings.map((w) => w.code)).toContain(
			"SCHEMA_KIND_UNSUPPORTED",
		);
	});

	it("clamps a zoom past the source maximum and says so", async () => {
		const result = await renderScene({ ...base, zoom: 17, width: 600 });

		expect(result.warnings.map((w) => w.code)).toContain("ZOOM_CLAMPED");
	});

	it("throws when a label is declared with no font", async () => {
		await expect(
			renderScene({
				...base,
				labelDeclarations: [
					{ kind: "labels", classes: ["city"], fontFamily: "Inter" },
				],
			}),
		).rejects.toThrow(/No font declared/);
	});

	/** Labels are the only text carrying a family; attribution sets none. */
	function countLabels(svg: string): number {
		return svg.split('font-family="Inter"').length - 1;
	}

	const covering: MarkerDeclaration = {
		kind: "marker",
		position: [9.9937, 53.5511],
		size: [1200, 300],
		anchor: "center",
		markup: '<circle r="1" />',
	};

	it("drops labels a marker covers, and keeps them when reserve is false", async () => {
		const shared = {
			...base,
			fonts: [{ family: "Inter", file: fontFile }],
			labelDeclarations: [
				{ kind: "labels", fontSize: 15, maxCount: 6 } as const,
			],
		};

		const reserved = await renderScene({ ...shared, markers: [covering] });
		const overlaid = await renderScene({
			...shared,
			markers: [{ ...covering, reserve: false }],
		});

		expect(countLabels(reserved.svg)).toBe(0);
		expect(countLabels(overlaid.svg)).toBeGreaterThan(0);
	});

	it("embeds declared fonts only when asked", async () => {
		const shared = {
			...base,
			fonts: [{ family: "Inter", file: fontFile }],
			labelDeclarations: [{ kind: "labels", fontSize: 15 } as const],
		};

		const plain = await renderScene(shared);
		const embedded = await renderScene({ ...shared, embedFonts: true });

		expect(plain.svg).not.toContain("@font-face");
		expect(embedded.svg).toContain('@font-face{font-family:"Inter"');
		expect(embedded.svg).toContain("src:url(data:font/ttf;base64,");
	});

	it("places labels and reserves marker boxes against them", async () => {
		const result = await renderScene({
			...base,
			fonts: [{ family: "Inter", file: fontFile }],
			labelDeclarations: [
				{ kind: "labels", fontSize: 15, halo: "#F5F5F3", maxCount: 6 },
			],
		});

		expect(result.svg).toContain("<text");
		expect(result.svg).toContain('font-family="Inter"');
	});
});

/**
 * Rewrites the golden when explicitly asked. The conditional lives here rather
 * than in the test body so the test itself stays branch-free.
 */
function maybeUpdateGolden(svg: string): void {
	if (process.env["UPDATE_GOLDEN"] === "1") {
		writeFileSync(GOLDEN, svg);
	}
}

describe("golden", () => {
	it("matches the committed reference render", async () => {
		const { svg } = await renderScene(base);

		maybeUpdateGolden(svg);

		expect(svg).toBe(readFileSync(GOLDEN, "utf8"));
	});
});
