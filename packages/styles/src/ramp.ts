import type { Zoomable } from "@stillmap/core";

/** A breakpoint: below `zoom`, the line takes `value`. */
export type Stop = readonly [zoom: number, value: number];

/**
 * Turns a breakpoint table into a zoom function, so a width ramp reads as data
 * rather than as a chain of conditionals:
 *
 *   step([[13, 2.2], [15, 3.2]], 4.6)
 *
 * is `(z) => (z < 13 ? 2.2 : z < 15 ? 3.2 : 4.6)`. The first stop above the
 * zoom wins, so the table has to be sorted ascending; `tail` applies from the
 * last breakpoint upwards.
 */
export function step(stops: readonly Stop[], tail: number): Zoomable<number> {
	return (zoom: number): number => {
		for (const [at, value] of stops) {
			if (zoom < at) {
				return value;
			}
		}

		return tail;
	};
}
