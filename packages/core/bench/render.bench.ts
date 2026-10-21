import { fileURLToPath } from "node:url";
import { test } from "vitest";

import { run } from "./baseline.js";
import { toPng } from "../src/png.js";
import { renderScene } from "../src/render.js";
import { createTileCache } from "../src/tiles.js";
import { createFixtureSource } from "../test/support/fixture-source.js";

import type { LabelDeclaration, LayerDeclaration } from "../src/declaration.js";
import type { RenderSceneArgs } from "../src/render.js";

const INTER = fileURLToPath(
	new URL("../test/fixtures/Inter-subset.ttf", import.meta.url),
);

const fonts = [{ family: "Inter", file: INTER }];

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
			classes: ["primary", "secondary"],
		},
		stroke: "#FCFBF9",
		width: 2.2,
	},
];

const labelDeclarations: LabelDeclaration[] = [
	{ kind: "labels", fontSize: 15, halo: "#F5F5F3" },
];

/** Several place classes at once, so the label search has real contention. */
const denseLabelDeclarations: LabelDeclaration[] = [
	{ kind: "labels", classes: ["city"], fontSize: 18, priority: 0 },
	{ kind: "labels", classes: ["suburb"], fontSize: 14, priority: 1 },
	{
		kind: "labels",
		classes: ["quarter", "neighbourhood"],
		fontSize: 12,
		priority: 2,
		shrink: 0.8,
	},
];

const base: RenderSceneArgs = {
	source: createFixtureSource(),
	center: [9.9937, 53.5511],
	zoom: 13,
	width: 1200,
	height: 300,
	declarations,
	labelDeclarations,
	markers: [],
	fonts,
	background: "#F5F5F3",
};

/**
 * Square canvas. Only the middle 300 rows fall inside the fixture tiles; the
 * rest renders empty, which leaves the label search as the dominant cost.
 */
const dense: RenderSceneArgs = {
	...base,
	height: 1200,
	labelDeclarations: denseLabelDeclarations,
};

/** Renders take tens of milliseconds; the default 500 ms window is too short. */
const options = { time: 3000, warmupIterations: 5 };

const warm = createTileCache();

await renderScene({ ...base, cache: warm });
await renderScene({ ...dense, cache: warm });

const { svg } = await renderScene({ ...base, cache: warm });

test("renderScene", async ({ bench }) => {
	await run(
		bench,
		{
			"warm cache": async () => {
				await renderScene({ ...base, cache: warm });
			},
			"dense labels, warm cache": async () => {
				await renderScene({ ...dense, cache: warm });
			},
		},
		options,
	);
});

test("toPng", async ({ bench }) => {
	await run(bench, {
		"scale 1": async () => {
			await toPng({ svg, width: 1200, scale: 1, fonts });
		},
		"scale 2": async () => {
			await toPng({ svg, width: 1200, scale: 2, fonts });
		},
	});
});
