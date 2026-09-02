import { Attribution, Font, Map, Pin, PlaceLabels } from "@stillmap/react";

import { INTER } from "../assets";
import { Neutral } from "./style";
import { memoizedOpenFreeMap } from "../render/source";

import type { Store } from "../stores";
import type { TileSource } from "@stillmap/core";
import type { ReactNode } from "react";

export const MAP_ZOOM = 13;

export interface StoreMapProps {
	readonly store: Store;
	readonly width: number;
	readonly height: number;
	/** Injected by the golden test so it can render from committed tiles. */
	readonly source?: TileSource;
}

export const StoreMap = ({
	store,
	width,
	height,
	source = memoizedOpenFreeMap(),
}: StoreMapProps): ReactNode => (
	<Map
		source={source}
		center={store.position}
		zoom={MAP_ZOOM}
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
			classes={["suburb", "quarter"]}
			fontSize={11.5}
			fontWeight={500}
			letterSpacing={0.58}
			maxCount={6}
			priority={3}
			color="#6E6E68"
			halo="#F5F5F3"
		/>

		<Pin position={store.position} fill="#9DB59D" padding={8} />
		<Attribution placement="bottom-right" />
	</Map>
);
