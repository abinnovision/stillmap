import { canvas, world } from "./geometry.js";
import { toCanvas } from "./mercator.js";

const bounds = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

/** Correct: a world point projects into canvas space. */
export const projected = toCanvas(world(1, 2), bounds);

export const rejected = (): unknown =>
	// @ts-expect-error a canvas point is already projected and must be rejected.
	toCanvas(canvas(1, 2), bounds);
