import { Attribution, Font, Map, Pin } from "@stillmap/react";
import { openFreeMap } from "@stillmap/sources";
import { Neutral, NEUTRAL } from "@stillmap/styles";

import { INTER } from "./assets.ts";

import type { LngLat, TileSource } from "@stillmap/core";
import type { ReactNode } from "react";

export interface LocatorProps {
	readonly position: LngLat;
	readonly source?: TileSource;
	readonly width?: number;
	readonly height?: number;
}

/**
 * The locator banner: one place, one marker, a wide crop.
 *
 * The style paints the tiles and the labels. The background beneath them and
 * the marker over them are not its to draw, so they come from its palette
 * instead.
 */
export const Locator = ({
	position,
	source = openFreeMap(),
	width = 1200,
	height = 300,
}: LocatorProps): ReactNode => (
	<Map
		source={source}
		center={position}
		zoom={13}
		width={width}
		height={height}
		background={NEUTRAL.chrome.background}
	>
		<Font family="Inter" file={INTER} />

		<Neutral />

		<Pin position={position} fill={NEUTRAL.chrome.marker} padding={8} />
		<Attribution placement="bottom-right" />
	</Map>
);
