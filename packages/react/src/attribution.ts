import { defineComponent } from "./registry.js";

import type {
	Attribution as AttributionEntry,
	AttributionDeclaration,
	Color,
	Placement,
} from "@stillmap/core";

export interface AttributionProps {
	readonly placement?: Placement;
	readonly color?: Color;
	readonly fontSize?: number;
	/** The product's own notices, appended after the source's. */
	readonly entries?: readonly AttributionEntry[];
}

/**
 * Positions the attribution the source requires.
 *
 * There is deliberately no way to disable it: attribution is a licence
 * condition, and baking it into the raster means it survives the file being
 * copied, embedded, or re-hosted. Omitting this element does not remove
 * attribution; it places it at the default corner. `entries` can only add
 * to what the source requires, never replace it.
 */
export const Attribution = defineComponent<AttributionProps>(
	"Attribution",
	"attribution",
	(props): AttributionDeclaration => ({
		kind: "attribution",
		...(props.placement === undefined ? {} : { placement: props.placement }),
		...(props.color === undefined ? {} : { color: props.color }),
		...(props.fontSize === undefined ? {} : { fontSize: props.fontSize }),
		...(props.entries === undefined ? {} : { entries: props.entries }),
	}),
);
