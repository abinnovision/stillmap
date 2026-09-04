import { anneal } from "./anneal.js";
import { GridIndex } from "./collision.js";
import { canvas } from "./geometry.js";
import { estimateMeasurer } from "./metrics.js";
import { wrapText } from "./wrap.js";

import type { Color } from "./filter.js";
import type { CanvasPoint } from "./geometry.js";
import type { TextMeasurer } from "./metrics.js";
import type { WarningCollector } from "./warnings.js";

/** An axis-aligned rectangle in canvas space. */
export interface Box {
	readonly minX: number;
	readonly minY: number;
	readonly maxX: number;
	readonly maxY: number;
}

export interface LabelCandidate {
	readonly text: string;
	readonly anchor: CanvasPoint;
	/** Lower wins a collision. */
	readonly priority: number;
	/** Source prominence. Breaks ties within a priority; lower sorts first. */
	readonly rank: number;
	readonly fontSize: number;
	readonly fontWeight: number;
	readonly letterSpacing: number;
	readonly fontFamily: string;
	readonly color: Color;
	readonly halo?: Color;
	readonly haloWidth: number;
	/**
	 * Smallest scale the label may shrink to when space is tight, in (0, 1).
	 * Unset means the label never shrinks.
	 */
	readonly shrink?: number;
	/**
	 * Widest a label may run before wrapping onto further lines, in ems.
	 * Defaults to 10. A single unbreakable word may still exceed it.
	 */
	readonly maxWidth?: number;
	/** Budget shared by every candidate declared by the same element. */
	readonly maxCount: number;
	/** Index of the declaring element. Scopes `maxCount`. */
	readonly element: number;
}

export type LabelAlign = "start" | "middle" | "end";

export interface PlacedLabel extends LabelCandidate {
	readonly box: Box;
	/** Point the text is drawn at. `align` names the edge it grows from. */
	readonly anchor: CanvasPoint;
	readonly align: LabelAlign;
	/** The text broken into lines, centred on the anchor. */
	readonly lines: readonly string[];
	/** Vertical distance between line centres. */
	readonly lineHeight: number;
}

/** Breathing room around a label box so text never quite touches. */
const LABEL_PADDING = 2;

/**
 * Cost of the shrunk variant of a position, on the same scale as position
 * penalties: roughly as objectionable as the worst full-size position, so the
 * search shrinks only when every full-size position is contested.
 */
const SHRINK_PENALTY = 0.5;

/** A label smaller than this is noise, not information. */
const MIN_LEGIBLE_FONT_SIZE = 8;

/** MapLibre's `text-max-width` default, in ems. */
const DEFAULT_MAX_WIDTH_EM = 10;

export function boxesOverlap(a: Box, b: Box): boolean {
	return !(
		a.maxX < b.minX ||
		a.minX > b.maxX ||
		a.maxY < b.minY ||
		a.minY > b.maxY
	);
}

/** One way a label could sit on the canvas. */
export interface LabelPosition {
	readonly box: Box;
	readonly anchor: CanvasPoint;
	readonly align: LabelAlign;
	readonly fontSize: number;
	readonly lines: readonly string[];
	readonly lineHeight: number;
	/** 0.0 is ideal, 1.0 borderline, above that objectionable. */
	readonly penalty: number;
}

/**
 * Relative placements around the feature point, most preferred first. A place
 * label has no drawn symbol, so sitting centred on the point is ideal and the
 * displaced positions exist to absorb collisions, at a growing cost. The set
 * deliberately includes mediocre positions: a varied candidate set is what
 * makes a good global labeling findable at all.
 */
const OFFSETS: readonly {
	/** Box centre offset in units of (gap + halfWidth, gap + halfHeight). */
	readonly dx: -1 | 0 | 1;
	readonly dy: -1 | 0 | 1;
	/** Extra vertical shift in halves of the box height. */
	readonly lift: number;
	readonly penalty: number;
}[] = [
	{ dx: 0, dy: 0, lift: 0, penalty: 0 },
	{ dx: 0, dy: 0, lift: -1, penalty: 0.05 },
	{ dx: 0, dy: 0, lift: 1, penalty: 0.08 },
	{ dx: 1, dy: 0, lift: 0, penalty: 0.12 },
	{ dx: -1, dy: 0, lift: 0, penalty: 0.18 },
	{ dx: 0, dy: -1, lift: 0, penalty: 0.22 },
	{ dx: 0, dy: 1, lift: 0, penalty: 0.26 },
	{ dx: 1, dy: -1, lift: 0, penalty: 0.32 },
	{ dx: -1, dy: -1, lift: 0, penalty: 0.38 },
	{ dx: 1, dy: 1, lift: 0, penalty: 0.42 },
	{ dx: -1, dy: 1, lift: 0, penalty: 0.48 },
];

interface PositionArgs {
	readonly candidate: LabelCandidate;
	readonly measure: TextMeasurer;
	readonly width: number;
	readonly height: number;
}

function positionsAtSize(
	args: PositionArgs,
	fontSize: number,
	basePenalty: number,
): LabelPosition[] {
	const { candidate, measure, width, height } = args;
	const style = {
		fontFamily: candidate.fontFamily,
		fontWeight: candidate.fontWeight,
		fontSize,
		letterSpacing: candidate.letterSpacing,
	};
	const lines = wrapText(candidate.text, {
		style,
		measure,
		maxWidth: (candidate.maxWidth ?? DEFAULT_MAX_WIDTH_EM) * fontSize,
	});
	const measured = lines.map((line) => measure(line, style));
	const lineHeight = Math.max(...measured.map((m) => m.ascent + m.descent));
	const pad = LABEL_PADDING + candidate.haloWidth / 2;
	const halfW = Math.max(...measured.map((m) => m.width)) / 2 + pad;
	const halfH = (lineHeight * lines.length) / 2 + pad;
	const gap = Math.max(2, fontSize * 0.15);
	const positions: LabelPosition[] = [];

	for (const offset of OFFSETS) {
		const cx = candidate.anchor.x + offset.dx * (gap + halfW);
		const cy =
			candidate.anchor.y + offset.dy * (gap + halfH) + offset.lift * halfH;
		const box: Box = {
			minX: cx - halfW,
			maxX: cx + halfW,
			minY: cy - halfH,
			maxY: cy + halfH,
		};

		// A box the canvas cannot hold is not a position, just a wish.
		if (box.minX < 0 || box.minY < 0 || box.maxX > width || box.maxY > height) {
			continue;
		}

		/*
		 * The drawn anchor sits on the side facing the feature, so the gap
		 * between them is exact even when the rasteriser's shaping disagrees
		 * with the measurement: the error accumulates on the far side, where
		 * nothing collides.
		 */
		const align: LabelAlign =
			offset.dx > 0 ? "start" : offset.dx < 0 ? "end" : "middle";
		const anchorX =
			align === "start"
				? box.minX + pad
				: align === "end"
					? box.maxX - pad
					: cx;

		positions.push({
			box,
			anchor: canvas(anchorX, cy),
			align,
			fontSize,
			lines,
			lineHeight,
			penalty: basePenalty + offset.penalty,
		});
	}

	return positions;
}

function positionsFor(args: PositionArgs): LabelPosition[] {
	const { candidate } = args;
	const positions = positionsAtSize(args, candidate.fontSize, 0);

	if (
		candidate.shrink !== undefined &&
		candidate.shrink < 1 &&
		candidate.fontSize * candidate.shrink >= MIN_LEGIBLE_FONT_SIZE
	) {
		positions.push(
			...positionsAtSize(
				args,
				candidate.fontSize * candidate.shrink,
				SHRINK_PENALTY,
			),
		);
	}

	return positions.sort((a, b) => a.penalty - b.penalty);
}

export interface PlaceLabelsArgs {
	readonly candidates: readonly LabelCandidate[];
	/** Boxes that are already occupied, such as marker footprints. */
	readonly reserved: readonly Box[];
	readonly width: number;
	readonly height: number;
	/** Real font metrics. Defaults to the estimate. */
	readonly measure?: TextMeasurer;
	/**
	 * Annealing effort, in temperature stages. 0 skips the search and keeps
	 * the greedy placement; the default of 50 is the published schedule.
	 */
	readonly annealingStages?: number;
	readonly warn: WarningCollector;
}

interface Admitted {
	readonly candidate: LabelCandidate;
	readonly positions: readonly LabelPosition[];
	readonly deletionCost: number;
}

/**
 * Cost of leaving a label off the map, on the position-penalty scale where a
 * poor position costs about 0.5. Prominent labels resist deletion harder,
 * which is what `priority` and `rank` mean, expressed as cost rather than
 * ordering.
 */
function deletionCost(candidate: LabelCandidate): number {
	return 4 + 2 / (1 + candidate.priority) + 4 / (1 + candidate.rank);
}

/**
 * Tries the label's positions in penalty order and claims the first free one.
 * Returns the claimed position index, or -1 when every position is taken.
 */
function claim(
	uid: number,
	positions: readonly LabelPosition[],
	grid: GridIndex,
): number {
	for (const [index, position] of positions.entries()) {
		if (!grid.hitTest(position.box)) {
			grid.insert(uid, position.box);

			return index;
		}
	}

	return -1;
}

/**
 * Places labels in three passes: a greedy seed in priority then rank order, a
 * simulated-annealing refinement over every position at once, and a final
 * enforcement pass that restores the hard guarantee that no two placed boxes
 * overlap. Each declaring element admits at most `maxCount` labels into the
 * search; the deterministic seed makes the whole render reproducible.
 */
export function placeLabels(args: PlaceLabelsArgs): readonly PlacedLabel[] {
	const measure = args.measure ?? estimateMeasurer;
	const sorted = [...args.candidates].sort(
		(a, b) => a.priority - b.priority || a.rank - b.rank,
	);

	const admitted: Admitted[] = [];
	const counts = new Map<number, number>();

	for (const candidate of sorted) {
		const used = counts.get(candidate.element) ?? 0;

		if (used >= candidate.maxCount) {
			continue;
		}

		// The label names a place, so an off-canvas place carries no label.
		if (
			candidate.anchor.x < 0 ||
			candidate.anchor.y < 0 ||
			candidate.anchor.x > args.width ||
			candidate.anchor.y > args.height
		) {
			continue;
		}

		const positions = positionsFor({
			candidate,
			measure,
			width: args.width,
			height: args.height,
		});

		if (positions.length === 0) {
			args.warn.warn(
				"LABEL_DROPPED",
				`Label "${candidate.text}" does not fit on the canvas.`,
				{ text: candidate.text },
			);
			continue;
		}

		/*
		 * Admission spends the element's budget, whether or not the label ends
		 * up placed: the budget bounds the search, not the outcome, which is
		 * what keeps it out of the optimiser's inner loop.
		 */
		counts.set(candidate.element, used + 1);
		admitted.push({
			candidate,
			positions,
			deletionCost: deletionCost(candidate),
		});
	}

	// Reserved boxes occupy the grid under uids past every label's.
	const seed = new GridIndex(args.width, args.height);

	for (const [index, box] of args.reserved.entries()) {
		seed.insert(admitted.length + index, box);
	}

	const states = admitted.map((label, uid) =>
		claim(uid, label.positions, seed),
	);

	const stages = args.annealingStages ?? 50;
	const refined =
		stages > 0
			? anneal({
					labels: admitted.map((label) => ({
						positions: label.positions,
						deletionCost: label.deletionCost,
					})),
					initial: states,
					reserved: args.reserved,
					width: args.width,
					height: args.height,
					maxStages: stages,
				})
			: states;

	/*
	 * The annealer optimises a soft cost, so its best labeling may still hold
	 * slight overlaps. The map may not: re-claim every box in priority order
	 * against a fresh grid, sliding to the next-best position on a collision
	 * and dropping the label when none is free. A label the annealer dropped
	 * gets one more chance here, since a free position is a free win.
	 */
	const grid = new GridIndex(args.width, args.height);

	for (const [index, box] of args.reserved.entries()) {
		grid.insert(admitted.length + index, box);
	}

	const placed: PlacedLabel[] = [];

	for (const [uid, label] of admitted.entries()) {
		const preferred = refined[uid] ?? -1;
		const order =
			preferred >= 0
				? [
						label.positions[preferred] as LabelPosition,
						...label.positions.filter((_, at) => at !== preferred),
					]
				: [...label.positions];
		const at = claim(uid, order, grid);

		if (at === -1) {
			args.warn.warn(
				"LABEL_DROPPED",
				`Label "${label.candidate.text}" collides with an already placed element.`,
				{ text: label.candidate.text },
			);
			continue;
		}

		const position = order[at] as LabelPosition;

		placed.push({
			...label.candidate,
			anchor: position.anchor,
			align: position.align,
			fontSize: position.fontSize,
			lines: position.lines,
			lineHeight: position.lineHeight,
			box: position.box,
		});
	}

	return placed;
}
