import { Attribution, Font, Map, Pin } from "@stillmap/react";
import { openFreeMap } from "@stillmap/sources";
import { Light, LIGHT } from "@stillmap/styles";

import { INTER } from "./assets.ts";

import type { LngLat, TileSource } from "@stillmap/core";
import type { ReactNode } from "react";

export const BRUSSELS: LngLat = [4.36066116237144, 50.84674456661067];

export interface BrusselsProps {
	readonly source?: TileSource;
	readonly width?: number;
	readonly height?: number;
	readonly zoom?: number;
}

/**
 * A second city in the `Light` style, at a wider crop than the locator, where
 * the inverted contrast has room to read.
 *
 * The pin sits on the same point as the "Brussels" place label. The marker
 * reserves its box by default, so the label relocates to a position beside
 * the pin instead of being covered by it.
 */
export const Brussels = ({
	source = openFreeMap(),
	width = 1200,
	height = 300,
	zoom = 12,
}: BrusselsProps): ReactNode => (
	<Map
		source={source}
		center={BRUSSELS}
		zoom={zoom}
		width={width}
		height={height}
		background={LIGHT.chrome.background}
		locale="en"
	>
		<Font family="Inter" file={INTER} />

		<Light />

		<Pin position={BRUSSELS} fill={LIGHT.chrome.marker} size={[22, 29]} />
		<Attribution placement="bottom-right" />
	</Map>
);
