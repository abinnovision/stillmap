import { Attribution, Font, Map, Marker } from "@stillmap/react";
import { openFreeMap } from "@stillmap/sources";

import { INTER } from "../src/assets.ts";
import { Neutral } from "../src/style.tsx";

import type { LngLat } from "@stillmap/core";
import type { ReactNode } from "react";

interface Office {
	readonly id: string;
	readonly position: LngLat;
}

/** Add or move an office and the viewport follows, because `fit` derives it. */
const OFFICES: readonly Office[] = [
	{ id: "a", position: [9.98, 53.545] },
	{ id: "b", position: [10.005, 53.558] },
	{ id: "c", position: [9.995, 53.552] },
];

/**
 * Several markers with the viewport derived from them, and custom artwork.
 * The header above the map reports the centre and zoom `fit` resolved to.
 *
 * Marker children are plain SVG. Anything the rasteriser does not draw is
 * dropped with a warning rather than silently ignored.
 */
const OfficesPreview = (): ReactNode => (
	<Map
		source={openFreeMap()}
		fit="markers"
		padding={64}
		maxZoom={14}
		width={900}
		height={600}
		background="#F5F5F3"
	>
		<Font family="Inter" file={INTER} />

		<Neutral />

		{OFFICES.map((office) => (
			<Marker
				key={office.id}
				position={office.position}
				anchor="center"
				size={[18, 18]}
				padding={6}
			>
				<circle
					cx="9"
					cy="9"
					r="7"
					fill="#9DB59D"
					stroke="#FFFFFF"
					strokeWidth="2"
				/>
			</Marker>
		))}

		<Attribution placement="bottom-left" />
	</Map>
);

export default OfficesPreview;
