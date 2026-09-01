import { Attribution, Font, Map, Marker } from "@stillmap/react";
import { openFreeMap } from "@stillmap/sources";

import { INTER } from "./assets.ts";
import { Neutral } from "./style.tsx";

import type { LngLat, TileSource } from "@stillmap/core";
import type { ReactNode } from "react";

export interface Office {
	readonly id: string;
	readonly position: LngLat;
}

export interface OfficesProps {
	readonly offices: readonly Office[];
	readonly source?: TileSource;
}

/** Several markers with the viewport derived from them, and custom artwork. */
export const Offices = ({
	offices,
	source = openFreeMap(),
}: OfficesProps): ReactNode => (
	<Map
		source={source}
		fit="markers"
		padding={64}
		maxZoom={14}
		width={900}
		height={600}
		background="#F5F5F3"
	>
		<Font family="Inter" file={INTER} />

		<Neutral />

		{offices.map((office) => (
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
