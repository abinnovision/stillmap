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
 * box fits the canvas and collides with nothing already placed.
 */
export function placeLabels(args: PlaceLabelsArgs): readonly PlacedLabel[] {
	const sorted = [...args.candidates].sort(
		(a, b) => a.priority - b.priority || a.rank - b.rank,
	);

	const occupied: Box[] = [...args.reserved];
	const placed: PlacedLabel[] = [];
	let count = 0;

	for (const candidate of sorted) {
		if (count >= candidate.maxCount) {
			continue;
		}

		const box = boxFor(candidate);

		const inside =
			box.minX >= 0 &&
			box.minY >= 0 &&
			box.maxX <= args.width &&
			box.maxY <= args.height;

		if (!inside) {
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

		occupied.push(box);
		placed.push({ ...candidate, box });
		count++;
	}

	return placed;
}
