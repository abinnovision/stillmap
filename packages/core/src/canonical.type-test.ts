import type { ClassOf } from "./canonical.js";

/** A kind with a vocabulary accepts a known literal. */
export const known: ClassOf<"road"> = "motorway";

/** ...and an arbitrary long-tail string. */
export const longTail: ClassOf<"road"> = "living_street";

// @ts-expect-error `building` has no classes, so nothing is assignable.
export const impossible: ClassOf<"building"> = "building";
