import { GridIndex } from "./collision.js";

import type { Box, LabelPosition } from "./labels.js";

/**
 * Weight of a label-label or label-reserved overlap, per unit of overlap
 * fraction. Two orders of magnitude above the position preference, after
 * Edmondson et al. (1996): overlap is a hard constraint expressed as cost.
 */
const OVERLAP_WEIGHT = 40;

/**
 * The published schedule from Christensen, Marks & Shieber (1995): an initial
 * temperature accepting a unit-cost regression two times in three, cooled by
 * a tenth per stage.
 */
const INITIAL_TEMPERATURE = 1 / Math.log(1.5);
const COOLING = 0.9;
const MOVES_PER_LABEL = 20;
const ACCEPTS_PER_LABEL = 5;

/**
 * Deterministic PRNG (mulberry32). The seed is fixed and internal: the same
 * scene must always produce the same labeling, byte for byte.
 */
const SEED = 0x51e11a9;

function mulberry32(seed: number): () => number {
	let state = seed >>> 0;

	return () => {
		state = (state + 0x6d2b79f5) >>> 0;

		let t = state;

		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Overlap area as a fraction of the smaller box, 0 when disjoint. */
function overlapFraction(a: Box, b: Box): number {
	const w = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
	const h = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);

	if (w <= 0 || h <= 0) {
		return 0;
	}

	const area = Math.min(
		(a.maxX - a.minX) * (a.maxY - a.minY),
		(b.maxX - b.minX) * (b.maxY - b.minY),
	);

	return area <= 0 ? 0 : (w * h) / area;
}

export interface AnnealLabel {
	readonly positions: readonly LabelPosition[];
	readonly deletionCost: number;
}

export interface AnnealArgs {
	readonly labels: readonly AnnealLabel[];
	/** Position index per label, -1 for dropped. Usually the greedy seed. */
	readonly initial: readonly number[];
	readonly reserved: readonly Box[];
	readonly width: number;
	readonly height: number;
	readonly maxStages: number;
}

/**
 * Simulated annealing over label states, where a state is one of the label's
 * positions or `dropped`. The energy sums position penalties, deletion costs,
 * and overlap fractions weighted heavily enough that the search resolves
 * congestion by moving or shrinking labels before it drops them, and drops
 * them before it lets them collide. Overlap is measured as area, not counted:
 * a count plateaus and starves the search of gradient.
 */
export function anneal(args: AnnealArgs): readonly number[] {
	const labels = args.labels;
	const count = labels.length;

	if (count === 0) {
		return [];
	}

	const rng = mulberry32(SEED);
	const grid = new GridIndex(args.width, args.height);

	for (const [index, box] of args.reserved.entries()) {
		grid.insert(count + index, box);
	}

	const states = [...args.initial];

	for (const [uid, state] of states.entries()) {
		if (state >= 0) {
			grid.insert(uid, (labels[uid] as AnnealLabel).positions[state]!.box);
		}
	}

	/** Cost the label at `uid` contributes in `state`, given the grid. */
	const costOf = (uid: number, state: number): number => {
		const label = labels[uid] as AnnealLabel;

		if (state < 0) {
			return label.deletionCost;
		}

		const position = label.positions[state] as LabelPosition;
		let cost = position.penalty;

		for (const other of grid.query(position.box)) {
			if (other !== uid) {
				cost +=
					OVERLAP_WEIGHT *
					overlapFraction(position.box, grid.boxOf(other) as Box);
			}
		}

		return cost;
	};

	const movesPerStage = MOVES_PER_LABEL * count;
	const earlyExit = ACCEPTS_PER_LABEL * count;
	let temperature = INITIAL_TEMPERATURE;

	for (let stage = 0; stage < args.maxStages; stage++) {
		let accepted = 0;

		for (let move = 0; move < movesPerStage; move++) {
			const uid = Math.floor(rng() * count);
			const label = labels[uid] as AnnealLabel;
			const from = states[uid] as number;

			// Draw a different state uniformly from {dropped} and the positions.
			let to = Math.floor(rng() * label.positions.length) - 1;

			if (to >= from) {
				to += 1;
			}

			/*
			 * The moved label leaves the grid first, so neither cost includes
			 * a self-overlap and the delta is exact.
			 */
			grid.remove(uid);

			const delta = costOf(uid, to) - costOf(uid, from);

			if (delta <= 0 || rng() < Math.exp(-delta / temperature)) {
				states[uid] = to;
				accepted += 1;
			}

			const settled = states[uid] as number;

			if (settled >= 0) {
				grid.insert(uid, label.positions[settled]!.box);
			}

			if (accepted > earlyExit) {
				break;
			}
		}

		if (accepted === 0) {
			break;
		}

		temperature *= COOLING;
	}

	return states;
}
