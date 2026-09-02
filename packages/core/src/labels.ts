import { canvas } from "./geometry.js";

import type { Color } from "./filter.js";
import type { CanvasPoint } from "./geometry.js";
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
	/** Budget shared by every candidate declared by the same element. */
	readonly maxCount: number;
	/** Index of the declaring element. Scopes `maxCount`. */
	readonly element: number;
}

export interface PlacedLabel extends LabelCandidate {
	readonly box: Box;
}

/**
 * Mean glyph advance as a fraction of the em, measured across the Latin subset.
 *
 * This is an estimate, not a metric. The real label engine reads the font;
 * until then a label may be placed slightly tighter or looser than it draws.
 * This is the quality ceiling the design document names as the project's
 * biggest risk.
 */
const MEAN_ADVANCE_EM = 0.55;

/** Breathing room around a label box so text never quite touches. */
const LABEL_PADDING = 2;

export function estimateTextWidth(
	text: string,
	fontSize: number,
	letterSpacing: number,
): number {
	return text.length * (fontSize * MEAN_ADVANCE_EM + letterSpacing);
}

export function boxesOverlap(a: Box, b: Box): boolean {
	return !(
		a.maxX < b.minX ||
		a.minX > b.maxX ||
		a.maxY < b.minY ||
		a.minY > b.maxY
	);
}

function boxFor(candidate: LabelCandidate): Box {
	const width = estimateTextWidth(
		candidate.text,
		candidate.fontSize,
		candidate.letterSpacing,
	);
	const height = candidate.fontSize;

	return {
		minX: candidate.anchor.x - width / 2 - LABEL_PADDING,
		maxX: candidate.anchor.x + width / 2 + LABEL_PADDING,
		minY: candidate.anchor.y - height / 2 - LABEL_PADDING,
		maxY: candidate.anchor.y + height / 2 + LABEL_PADDING,
	};
}

/**
 * Slides a box back inside the canvas, or returns null when it is too large to
 * fit at all.
 *
 * A label whose anchor is comfortably on screen used to be discarded whole for
 * overhanging an edge by a few pixels, which cost around one label in six on a
 * 1200x600 render. Only the box moves; the place it names does not, so callers
 * must carry the same shift onto the anchor the text is drawn at.
 */
function fitInside(box: Box, width: number, height: number): Box | null {
	if (box.maxX - box.minX > width || box.maxY - box.minY > height) {
		return null;
	}

	const dx = box.minX < 0 ? -box.minX : Math.min(0, width - box.maxX);
	const dy = box.minY < 0 ? -box.minY : Math.min(0, height - box.maxY);

	if (dx === 0 && dy === 0) {
		return box;
	}

	return {
		minX: box.minX + dx,
		maxX: box.maxX + dx,
		minY: box.minY + dy,
		maxY: box.maxY + dy,
	};
}

export interface PlaceLabelsArgs {
	readonly candidates: readonly LabelCandidate[];
	/** Boxes that are already occupied, such as marker footprints. */
	readonly reserved: readonly Box[];
	readonly width: number;
	readonly height: number;
	readonly warn: WarningCollector;
}

/**
 * Greedy placement in priority then rank order. A candidate is placed when its
 * anchor is on the canvas and its box collides with nothing already placed. A
 * box overhanging an edge slides inside rather than losing the label. Each
 * declaring element spends its own `maxCount`.
 */
export function placeLabels(args: PlaceLabelsArgs): readonly PlacedLabel[] {
	const sorted = [...args.candidates].sort(
		(a, b) => a.priority - b.priority || a.rank - b.rank,
	);

	const occupied: Box[] = [...args.reserved];
	const placed: PlacedLabel[] = [];
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

		const natural = boxFor(candidate);
		const box = fitInside(natural, args.width, args.height);

		if (box === null) {
			continue;
		}

		if (occupied.some((other) => boxesOverlap(box, other))) {
			args.warn.warn(
				"LABEL_DROPPED",
				`Label "${candidate.text}" collides with an already placed element.`,
				{ text: candidate.text },
			);
			continue;
		}

		const dx = box.minX - natural.minX;
		const dy = box.minY - natural.minY;

		occupied.push(box);
		placed.push({
			...candidate,
			...(dx === 0 && dy === 0
				? {}
				: {
						anchor: canvas(candidate.anchor.x + dx, candidate.anchor.y + dy),
					}),
			box,
		});
		counts.set(candidate.element, used + 1);
	}

	return placed;
}
