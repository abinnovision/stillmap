import { Building, Road, Water } from "./layers.js";

/** A canonical class from the vocabulary. */
export const known = <Road classes="motorway" stroke="#fff" />;

/** ...and an arbitrary long-tail string, because the union is open. */
export const longTail = <Road classes="living_street" stroke="#fff" />;

// @ts-expect-error Building has no class vocabulary.
export const noClasses = <Building classes="building" fill="#fff" />;

// @ts-expect-error Building is a fill-only kind and takes no stroke width.
export const noStroke = <Building fill="#fff" width={2} />;

// @ts-expect-error Road is a line kind and takes no fill.
export const noFill = <Road fill="#fff" />;

export const water = <Water fill="#E1E4E7" />;
