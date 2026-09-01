import { Attribution, Font, Map, Pin, PlaceLabels } from "@stillmap/react";
import { openFreeMap } from "@stillmap/sources";

import { INTER } from "./assets.ts";
import { Neutral } from "./style.tsx";

import type { LngLat, TileSource } from "@stillmap/core";
import type { ReactNode } from "react";

export interface LocatorProps {
	readonly position: LngLat;
	readonly source?: TileSource;
	readonly width?: number;
	readonly height?: number;
}

/** The locator banner: one place, one marker, a wide crop. */
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
		background="#F5F5F3"
	>
		<Font family="Inter" file={INTER} />

		<Neutral />

		<PlaceLabels
			classes="city"
			fontSize={15}
			fontWeight={600}
			letterSpacing={0.3}
			maxCount={3}
			priority={0}
			color="#6E6E68"
			halo="#F5F5F3"
		/>
		<PlaceLabels
			classes="town"
			fontSize={13}
			fontWeight={600}
			letterSpacing={0.26}
			maxCount={4}
			priority={1}
			color="#6E6E68"
			halo="#F5F5F3"
		/>
		<PlaceLabels
			classes={["suburb", "quarter"]}
			fontSize={11.5}
			fontWeight={500}
			letterSpacing={0.58}
			maxCount={6}
			priority={3}
			color="#6E6E68"
			halo="#F5F5F3"
		/>

		<Pin position={position} fill="#9DB59D" padding={8} />
		<Attribution placement="bottom-right" />
	</Map>
);
