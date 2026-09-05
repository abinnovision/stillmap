import { Attribution, Font, Map, Pin, PlaceLabels } from "@stillmap/react";

import { INTER } from "../assets";
import { Neutral } from "./style";

import type { Store } from "../stores";
import type { FontFace, TileSource } from "@stillmap/core";
import type { ReactNode } from "react";

export const MAP_ZOOM = 13;

/**
 * Highest place rank to label. Rank is prominence from the tile, so this drops
 * the least notable suburbs rather than whichever ones happen to sort last.
 *
 * A constant rather than a zoom curve, because this map only ever renders at
 * `MAP_ZOOM`. Neither element sets `maxCount` either: at this zoom the canvas
 * holds few enough places that collision settles the count long before any
 * budget would, so the area-derived default is left to cover the larger sizes
 * the route may grow into.
 */
const PLACE_RANK = 24;

/** What the server hoists, repeated here so the golden test needs no wiring. */
const DEFAULT_FONTS: readonly FontFace[] = [{ family: "Inter", file: INTER }];

export interface StoreMapProps {
	readonly store: Store;
	readonly width: number;
	readonly height: number;
	/** Owned by the caller: one memoised source is shared across renders. */
	readonly source: TileSource;
	readonly fonts?: readonly FontFace[];
}

export const StoreMap = ({
	store,
	width,
	height,
	source,
	fonts = DEFAULT_FONTS,
}: StoreMapProps): ReactNode => (
	<Map
		source={source}
		center={store.position}
		zoom={MAP_ZOOM}
		width={width}
		height={height}
		background="#F5F5F3"
	>
		{fonts.map((font) => (
			<Font key={font.family} {...font} />
		))}

		<Neutral />

		<PlaceLabels
			classes="city"
			fontSize={15}
			fontWeight={600}
			letterSpacing={0.3}
			maxRank={PLACE_RANK}
			priority={0}
			color="#6E6E68"
			halo="#F5F5F3"
		/>
		<PlaceLabels
			classes={["town", "village", "suburb", "quarter"]}
			fontSize={11.5}
			fontWeight={500}
			letterSpacing={0.58}
			maxRank={PLACE_RANK}
			priority={3}
			color="#6E6E68"
			halo="#F5F5F3"
		/>

		<Pin position={store.position} fill="#9DB59D" padding={8} />
		<Attribution placement="bottom-right" />
	</Map>
);
