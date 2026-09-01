import { Attribution, Font, Map, Pin } from "@stillmap/react";
import { openFreeMap } from "@stillmap/sources";

import { INTER } from "./assets.ts";
import { LIGHT, MapboxLight, MapboxLightLabels } from "./mapbox-light.tsx";

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
 * A partial reconstruction of a Mapbox light-v11 static map, matching the
 * centre, zoom and size of
 *
 *   api.mapbox.com/styles/v1/mapbox/light-v11/static
 *     /pin-s+668CAA(4.36066,50.84674)/4.36066,50.84674,12/1200x300@2x
 *
 * The tiles are OpenFreeMap rather than Mapbox, so the two will never agree
 * feature for feature. The style is what is being reproduced.
 *
 * The pin sits on the same point as the "Brussels" place label. A marker
 * claims its box against label collision by default, which would drop that
 * label, so this one opts out with `reserve={false}` and draws over the labels
 * instead. Mapbox nudges the label aside; stillmap has no displacement, so the
 * choice is between losing the label and overlapping it.
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
		background={LIGHT.background}
		locale="en"
	>
		<Font family="Inter" file={INTER} />

		<MapboxLight />
		<MapboxLightLabels />

		<Pin position={BRUSSELS} fill="#668CAA" size={[22, 29]} reserve={false} />
		<Attribution placement="bottom-right" />
	</Map>
);
