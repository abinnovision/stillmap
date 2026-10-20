import { readFileSync } from "node:fs";
import { bench, describe } from "vitest";

import { GridIndex } from "../src/collision.js";
import { decodeTile } from "../src/decode.js";
import { canvas } from "../src/geometry.js";
import { placeLabels } from "../src/labels.js";
import { createWarningCollector } from "../src/warnings.js";

import type { Box, LabelCandidate } from "../src/labels.js";

const tile = readFileSync(
	new URL("../test/fixtures/openfreemap-z13-4323-2647.mvt", import.meta.url),
);

const buffer = tile.buffer.slice(
	tile.byteOffset,
	tile.byteOffset + tile.byteLength,
);

const WIDTH = 1200;
const HEIGHT = 800;

/** Deterministic scatter of boxes, so the grid sees the same load each run. */
const boxes: Box[] = Array.from({ length: 400 }, (_, i) => {
	const minX = (i * 97) % (WIDTH - 60);
	const minY = (i * 53) % (HEIGHT - 20);

	return { minX, minY, maxX: minX + 60, maxY: minY + 20 };
});

const candidates: LabelCandidate[] = Array.from({ length: 120 }, (_, i) => ({
	text: `Place ${String(i)}`,
	anchor: canvas((i * 97) % WIDTH, (i * 53) % HEIGHT),
	priority: i % 3,
	rank: i % 10,
	fontSize: 14,
	fontWeight: 400,
	letterSpacing: 0,
	fontFamily: "Inter",
	color: "#222222",
	haloWidth: 0,
	shrink: 0.8,
	maxCount: 120,
	element: 0,
}));

describe("decodeTile", () => {
	bench("transportation and water", () => {
		decodeTile({
			buffer,
			coord: { z: 13, column: 4323, y: 2647 },
			tileDisplaySize: 512,
			sourceLayers: ["transportation", "water"],
		});
	});
});

describe("GridIndex", () => {
	bench("insert and hit test", () => {
		const grid = new GridIndex(WIDTH, HEIGHT);

		for (const [uid, box] of boxes.entries()) {
			if (!grid.hitTest(box)) {
				grid.insert(uid, box);
			}
		}
	});
});

describe("placeLabels", () => {
	const place = (annealingStages: number): void => {
		placeLabels({
			candidates,
			reserved: [],
			width: WIDTH,
			height: HEIGHT,
			annealingStages,
			warn: createWarningCollector({}),
		});
	};

	bench("greedy seed only", () => {
		place(0);
	});

	// Over 100 ms per call, so it needs a longer window than the default.
	bench(
		"with annealing",
		() => {
			place(50);
		},
		{ time: 3000 },
	);
});
