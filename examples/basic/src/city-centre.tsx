import { Attribution, Font, GeoJson, Map } from "@stillmap/react";
import { openFreeMap } from "@stillmap/sources";
import { Light, LIGHT } from "@stillmap/styles";

import { INTER } from "./assets.ts";

import type { GeoJsonPolygon, LngLat, TileSource } from "@stillmap/core";
import type { ReactNode } from "react";

const HAMBURG: LngLat = [9.9937, 53.5511];

/** Hamburg's old town, traced by hand between the Alster and the Elbe. */
const CITY_CENTRE: GeoJsonPolygon = {
	type: "Polygon",
	coordinates: [
		[
			[9.9845, 53.5545],
			[9.9925, 53.5532],
			[10.0005, 53.5562],
			[10.0068, 53.5528],
			[10.0062, 53.5468],
			[9.9965, 53.5445],
			[9.9832, 53.5452],
			[9.9798, 53.5498],
			[9.9845, 53.5545],
		],
	],
};

export interface CityCentreProps {
	readonly source?: TileSource;
}

/**
 * Your own geometry under the streets. The polygon goes in the style's
 * `belowRoads` slot, so the road network still reads across it.
 */
export const CityCentre = ({
	source = openFreeMap(),
}: CityCentreProps): ReactNode => (
	<Map
		source={source}
		center={HAMBURG}
		zoom={13}
		width={1200}
		height={300}
		background={LIGHT.chrome.background}
	>
		<Font family="Inter" file={INTER} />

		<Light
			belowRoads={
				<GeoJson
					data={CITY_CENTRE}
					fill="#F2E3C6"
					stroke="#C9A66B"
					width={1.5}
				/>
			}
		/>

		<Attribution placement="bottom-right" />
	</Map>
);
