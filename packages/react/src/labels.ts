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
	/** Placement budget for this element alone. */
	readonly maxCount?: number;
	/** Lower wins a collision against another label element. */
	readonly priority?: number;
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
	"priority",
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
