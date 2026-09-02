import { PlaceLabels } from "@stillmap/react";

import type { LabelPalette } from "@stillmap/core";
import type { PlaceLabelsProps } from "@stillmap/react";
import type { ReactNode } from "react";

/**
 * The typographic half of one label tier, taken from `PlaceLabels` itself so
 * the two cannot drift. Colour comes from the palette instead.
 */
export type LabelTier = Pick<
	PlaceLabelsProps,
	"haloWidth" | "letterSpacing" | "maxCount"
> &
	Required<Pick<PlaceLabelsProps, "fontSize" | "fontWeight" | "priority">>;

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
 * Highest place rank each tier will place, by zoom.
 *
 * Rank is quantized rather than continuous in OpenMapTiles. Measured across six
 * regions on live tiles, raising the threshold from 10 to 13 takes central
 * Hamburg at z8 from 5 labels to 42, while anything above about 25 changes
 * nothing at all. A smooth curve fits that badly, so these steps sit on the
 * cliffs the data actually has.
 *
 * One curve serves all three tiers because rank already encodes the hierarchy:
 * a city ranks around 3 and a suburb 12 or worse, so a low threshold drops the
 * minor tiers at low zoom without a separate zoom gate per tier.
 */
function placeRank(zoom: number): number {
	if (zoom < 5) {
		return 4;
	}

	if (zoom < 7) {
		return 8;
	}

	if (zoom < 11) {
		return 13;
	}

	if (zoom < 13) {
		return 16;
	}

	return 30;
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
				maxRank={placeRank}
				{...scale.primary}
				{...family}
			/>
			<PlaceLabels
				classes={["town", "village", "suburb"]}
				color={palette.secondary}
				halo={palette.halo}
				maxRank={placeRank}
				{...scale.secondary}
				{...family}
			/>
			<PlaceLabels
				classes={["quarter", "neighbourhood", "hamlet"]}
				color={palette.tertiary}
				halo={palette.halo}
				maxRank={placeRank}
				{...scale.tertiary}
				{...family}
			/>
		</>
	);
};
