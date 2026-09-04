import { describe, expect, it } from "vitest";

import { canvas } from "./geometry.js";
import { boxesOverlap, placeLabels } from "./labels.js";
import { createWarningCollector } from "./warnings.js";

import type { LabelCandidate } from "./labels.js";

function candidate(overrides: Partial<LabelCandidate> = {}): LabelCandidate {
	return {
		text: "Hamburg",
		anchor: canvas(200, 150),
		priority: 0,
		rank: 1,
		fontSize: 15,
		fontWeight: 600,
		letterSpacing: 0.3,
		fontFamily: "Inter",
		color: "#6E6E68",
		haloWidth: 3,
		maxCount: 10,
		element: 0,
		...overrides,
	};
}

describe("placeLabels", () => {
	it("places a lone label", () => {
		const placed = placeLabels({
			candidates: [candidate()],
			reserved: [],
			width: 400,
			height: 300,
			warn: createWarningCollector({}),
		});

		expect(placed).toHaveLength(1);
		expect(placed[0]?.text).toBe("Hamburg");
	});

	it("relocates a colliding label to a free position instead of dropping it", () => {
		const warn = createWarningCollector({});
		const placed = placeLabels({
			candidates: [
				candidate({ text: "First", priority: 0 }),
				candidate({ text: "Second", priority: 1 }),
			],
			reserved: [],
			width: 400,
			height: 300,
			warn,
		});

		expect(placed.map((p) => p.text)).toEqual(["First", "Second"]);

		const [first, second] = placed as [
			(typeof placed)[number],
			(typeof placed)[number],
		];

		expect(boxesOverlap(first.box, second.box)).toBe(false);
		expect(warn.warnings).toEqual([]);
	});

	it("sorts by priority then rank before placing", () => {
		const placed = placeLabels({
			candidates: [
				candidate({ text: "Low", priority: 2, anchor: canvas(60, 50) }),
				candidate({ text: "High", priority: 0, anchor: canvas(300, 250) }),
				candidate({ text: "Mid", priority: 1, anchor: canvas(180, 150) }),
			],
			reserved: [],
			width: 400,
			height: 300,
			warn: createWarningCollector({}),
		});

		expect(placed.map((p) => p.text)).toEqual(["High", "Mid", "Low"]);
	});

	it("respects reserved boxes such as markers", () => {
		const warn = createWarningCollector({});
		const placed = placeLabels({
			candidates: [candidate()],
			reserved: [{ minX: 100, minY: 100, maxX: 300, maxY: 200 }],
			width: 400,
			height: 300,
			warn,
		});

		expect(placed).toEqual([]);
		expect(warn.warnings.map((w) => w.code)).toEqual(["LABEL_DROPPED"]);
	});

	it("drops labels whose box falls outside the canvas", () => {
		const placed = placeLabels({
			candidates: [candidate({ anchor: canvas(-500, -500) })],
			reserved: [],
			width: 400,
			height: 300,
			warn: createWarningCollector({}),
		});

		expect(placed).toEqual([]);
	});

	it("honours each candidate's own maxCount budget", () => {
		const placed = placeLabels({
			candidates: [
				candidate({ text: "A", anchor: canvas(60, 40), maxCount: 2 }),
				candidate({ text: "B", anchor: canvas(60, 140), maxCount: 2 }),
				candidate({ text: "C", anchor: canvas(60, 240), maxCount: 2 }),
			],
			reserved: [],
			width: 400,
			height: 300,
			warn: createWarningCollector({}),
		});

		expect(placed.map((p) => p.text)).toEqual(["A", "B"]);
	});

	it("slides a box overhanging an edge back inside rather than dropping it", () => {
		const placed = placeLabels({
			candidates: [
				candidate({ text: "Altona-Altstadt", anchor: canvas(395, 150) }),
			],
			reserved: [],
			width: 400,
			height: 300,
			warn: createWarningCollector({}),
		});

		expect(placed).toHaveLength(1);

		const [label] = placed as [(typeof placed)[number]];

		expect(label.box.maxX).toBeLessThanOrEqual(400);
		expect(label.box.minX).toBeGreaterThanOrEqual(0);
		// The drawn text follows the box, or the two would disagree.
		expect(label.anchor.x).toBeLessThan(395);
	});

	it("drops a label too wide for the canvas to hold", () => {
		const placed = placeLabels({
			candidates: [
				candidate({ text: "A".repeat(200), anchor: canvas(200, 150) }),
			],
			reserved: [],
			width: 400,
			height: 300,
			warn: createWarningCollector({}),
		});

		expect(placed).toEqual([]);
	});

	it("gives each element its own budget rather than a shared one", () => {
		const placed = placeLabels({
			candidates: [
				candidate({ text: "A1", anchor: canvas(60, 40), maxCount: 2 }),
				candidate({ text: "A2", anchor: canvas(60, 140), maxCount: 2 }),
				candidate({
					text: "B1",
					anchor: canvas(260, 40),
					maxCount: 2,
					element: 1,
					priority: 1,
				}),
				candidate({
					text: "B2",
					anchor: canvas(260, 140),
					maxCount: 2,
					element: 1,
					priority: 1,
				}),
			],
			reserved: [],
			width: 400,
			height: 300,
			warn: createWarningCollector({}),
		});

		expect(placed.map((p) => p.text)).toEqual(["A1", "A2", "B1", "B2"]);
	});
	it("places the same scene identically on every run", () => {
		const crowd = Array.from({ length: 40 }, (_, i) =>
			candidate({
				text: `Place ${String(i)}`,
				anchor: canvas(40 + (i % 8) * 45, 40 + Math.floor(i / 8) * 50),
				rank: i,
			}),
		);
		const place = (): readonly string[] =>
			placeLabels({
				candidates: crowd,
				reserved: [],
				width: 400,
				height: 300,
				warn: createWarningCollector({}),
			}).map((p) => `${p.text}@${String(p.box.minX)},${String(p.box.minY)}`);

		expect(place()).toEqual(place());
	});

	it("never places two overlapping boxes, however crowded", () => {
		const crowd = Array.from({ length: 60 }, (_, i) =>
			candidate({
				text: "Dense",
				anchor: canvas(180 + (i % 10) * 5, 140 + Math.floor(i / 10) * 5),
				rank: i,
				maxCount: 60,
			}),
		);
		const placed = placeLabels({
			candidates: crowd,
			reserved: [],
			width: 400,
			height: 300,
			warn: createWarningCollector({}),
		});

		for (const [i, a] of placed.entries()) {
			for (const b of placed.slice(i + 1)) {
				expect(boxesOverlap(a.box, b.box)).toBe(false);
			}
		}
	});

	it("shrinks a label that only fits the canvas at a smaller size", () => {
		/*
		 * "Wilhelmsburg" at 15px measures wider than a 108px canvas, so every
		 * full-size position is rejected; at 85% it fits, so the shrunk
		 * variants are the label's only way onto the map.
		 */
		const place = (shrink?: number): ReturnType<typeof placeLabels> =>
			placeLabels({
				candidates: [
					candidate({
						text: "Wilhelmsburg",
						anchor: canvas(54, 150),
						...(shrink === undefined ? {} : { shrink }),
					}),
				],
				reserved: [],
				width: 108,
				height: 300,
				warn: createWarningCollector({}),
			});

		expect(place()).toEqual([]);

		const placed = place(0.85);

		expect(placed.map((p) => p.fontSize)).toEqual([15 * 0.85]);
	});

	it("keeps the greedy result when annealing is disabled", () => {
		const crowd = [
			candidate({ text: "One", anchor: canvas(100, 100) }),
			candidate({ text: "Two", anchor: canvas(120, 100), rank: 2 }),
		];
		const placed = placeLabels({
			candidates: crowd,
			reserved: [],
			width: 400,
			height: 300,
			annealingStages: 0,
			warn: createWarningCollector({}),
		});

		expect(placed.map((p) => p.text)).toEqual(["One", "Two"]);
	});
});
