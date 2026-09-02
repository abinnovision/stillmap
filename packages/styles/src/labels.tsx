import { PlaceLabels } from "@stillmap/react";

import type { LabelPalette } from "@stillmap/core";
import type { PlaceLabelsProps } from "@stillmap/react";
import type { ReactNode } from "react";

/**
 * The typographic half of one label tier, taken from `PlaceLabels` itself so
 * the two cannot drift. Colour comes from the palette instead.
 */
export type LabelTier = Pick<PlaceLabelsProps, "haloWidth" | "letterSpacing"> &
	Required<
		Pick<PlaceLabelsProps, "fontSize" | "fontWeight" | "maxCount" | "priority">
	>;

/** One tier per `LabelPalette` colour, in the same order. */
export interface LabelScale {
	readonly primary: LabelTier;
	readonly secondary: LabelTier;
	readonly tertiary: LabelTier;
}

export interface PlaceLabelBlockProps {
	readonly palette: LabelPalette;
	readonly scale: LabelScale;
	readonly fontFamily?: string;
}

/**
 * The three-tier place hierarchy shared by every style. Collision runs once
 * across all three, with `priority` deciding, so the tiers have to be declared
 * together rather than folded into the paint rules.
 *
 * `fontFamily` is deliberately absent unless asked for: the renderer falls back
 * to the first font the map declares, which is the only family a style can
 * safely assume exists.
 */
export const PlaceLabelBlock = ({
	palette,
	scale,
	fontFamily,
}: PlaceLabelBlockProps): ReactNode => {
	const family = fontFamily === undefined ? {} : { fontFamily };

	return (
		<>
			<PlaceLabels
				classes="city"
				color={palette.primary}
				halo={palette.halo}
				{...scale.primary}
				{...family}
			/>
			<PlaceLabels
				classes={["town", "suburb"]}
				color={palette.secondary}
				halo={palette.halo}
				{...scale.secondary}
				{...family}
			/>
			<PlaceLabels
				classes={["quarter", "neighbourhood"]}
				color={palette.tertiary}
				halo={palette.halo}
				{...scale.tertiary}
				{...family}
			/>
		</>
	);
};
