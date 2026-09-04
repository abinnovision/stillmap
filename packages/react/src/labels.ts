import { defineComponent } from "./registry.js";

import type {
	ClassOf,
	Color,
	LabelDeclaration,
	Zoomable,
} from "@stillmap/core";

export interface PlaceLabelsProps {
	readonly classes?: ClassOf<"place"> | readonly ClassOf<"place">[];
	readonly minZoom?: number;
	readonly maxZoom?: number;
	readonly color?: Color;
	readonly halo?: Color;
	readonly haloWidth?: number;
	readonly fontFamily?: string;
	readonly fontSize?: Zoomable<number>;
	readonly fontWeight?: number;
	readonly letterSpacing?: number;
	/**
	 * Placement budget for this element alone. Defaults to a budget derived from
	 * the canvas area, so a tall map carries more labels than a banner.
	 */
	readonly maxCount?: Zoomable<number>;
	/**
	 * Highest source rank to place, inclusive. Rank is place prominence from the
	 * tile: lower is more prominent. This is the knob that thins labels as the
	 * map zooms out, because it drops the least prominent places rather than
	 * whichever ones happen to sort last.
	 */
	readonly maxRank?: Zoomable<number>;
	/** Lower wins a collision against another label element. */
	readonly priority?: number;
	/**
	 * Smallest scale labels may shrink to when space is tight, in (0, 1).
	 * Unset never shrinks.
	 */
	readonly shrink?: number;
}

const OPTIONAL = [
	"minZoom",
	"maxZoom",
	"color",
	"halo",
	"haloWidth",
	"fontFamily",
	"fontSize",
	"fontWeight",
	"letterSpacing",
	"maxCount",
	"maxRank",
	"priority",
	"shrink",
] as const;

/**
 * Place labels. Per-class styling comes from repeating the element: collision
 * runs once globally across every one of them, with `priority` deciding.
 */
export const PlaceLabels = defineComponent<PlaceLabelsProps>(
	"PlaceLabels",
	"labels",
	(props): LabelDeclaration => {
		const record = props as Readonly<Record<string, unknown>>;
		const classes =
			props.classes === undefined
				? undefined
				: typeof props.classes === "string"
					? [props.classes]
					: props.classes;

		return {
			kind: "labels",
			...(classes === undefined ? {} : { classes }),
			...Object.fromEntries(
				OPTIONAL.filter((key) => record[key] !== undefined).map((key) => [
					key,
					record[key],
				]),
			),
		};
	},
);
