import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { toPng } from "../src/png.js";
import { renderScene } from "../src/render.js";
import { createTileCache } from "../src/tiles.js";
import { createFixtureSource } from "../test/support/fixture-source.js";

import type { RenderSceneArgs } from "../src/render.js";

/**
 * Run with `--expose-gc`. Reports how heap and RSS behave over sequential
 * renders and what a full tile cache retains. Nothing is asserted.
 */

const RENDERS = 50;
const CACHE_LIMIT = 150;
const MB = 1024 * 1024;

const INTER = fileURLToPath(
	new URL("../test/fixtures/Inter-subset.ttf", import.meta.url),
);

const fonts = [{ family: "Inter", file: INTER }];

const cache = createTileCache();

const args: RenderSceneArgs = {
	source: createFixtureSource(),
	center: [9.9937, 53.5511],
	zoom: 13,
	width: 1200,
	height: 300,
	declarations: [
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
	],
	labelDeclarations: [{ kind: "labels", fontSize: 15, halo: "#F5F5F3" }],
	markers: [],
	fonts,
	background: "#F5F5F3",
	cache,
};

const collect = (): NodeJS.MemoryUsage => {
	global.gc?.();

	return process.memoryUsage();
};

const mb = (bytes: number): number => Math.round((bytes / MB) * 10) / 10;

const renderOnce = async (): Promise<void> => {
	const { svg } = await renderScene(args);

	await toPng({ svg, width: args.width, scale: 1, fonts });
};

for (let i = 0; i < 5; i++) {
	await renderOnce();
}

const before = collect();
let peakRss = before.rss;
let peakHeap = before.heapUsed;
const started = performance.now();

for (let i = 0; i < RENDERS; i++) {
	await renderOnce();

	const usage = process.memoryUsage();

	peakRss = Math.max(peakRss, usage.rss);
	peakHeap = Math.max(peakHeap, usage.heapUsed);
}

const elapsed = performance.now() - started;
const after = collect();

console.table({
	renders: { value: RENDERS },
	"baseline heapUsed (MB)": { value: mb(before.heapUsed) },
	"baseline rss (MB)": { value: mb(before.rss) },
	"peak heapUsed (MB)": { value: mb(peakHeap) },
	"peak rss (MB)": { value: mb(peakRss) },
	"retained heap delta (MB)": { value: mb(after.heapUsed - before.heapUsed) },
	"mean ms per render": { value: Math.round((elapsed / RENDERS) * 10) / 10 },
	"tile cache size": { value: cache.size },
});

const tile = readFileSync(
	new URL("../test/fixtures/openfreemap-z13-4323-2647.mvt", import.meta.url),
);

const emptyBefore = collect();
const full = createTileCache(CACHE_LIMIT);

for (let i = 0; i < CACHE_LIMIT; i++) {
	full.set(
		String(i),
		tile.buffer.slice(tile.byteOffset, tile.byteOffset + tile.byteLength),
	);
}

const filled = collect();

console.table({
	entries: { value: full.size },
	"retained heapUsed (MB)": {
		value: mb(filled.heapUsed - emptyBefore.heapUsed),
	},
	"retained arrayBuffers (MB)": {
		value: mb(filled.arrayBuffers - emptyBefore.arrayBuffers),
	},
});
