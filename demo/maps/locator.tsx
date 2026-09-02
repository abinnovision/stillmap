import { Attribution, Font, Map, Pin, PlaceLabels } from "@stillmap/react";
import { openFreeMap } from "@stillmap/sources";

import { INTER } from "../src/assets.ts";
import { Neutral } from "../src/style.tsx";

import type { LngLat } from "@stillmap/core";
import type { ReactNode } from "react";

/** Move the pin: any [longitude, latitude] pair works. */
const HAMBURG: LngLat = [9.9937, 53.5511];

/**
 * One place, one marker, a wide crop. Edit anything below and save; the
 * preview re-renders on its own.
 */
const LocatorPreview = (): ReactNode => (
	<Map
		source={openFreeMap()}
		center={HAMBURG}
		zoom={13}
		width={1200}
		height={300}
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

		<Pin position={HAMBURG} fill="#9DB59D" padding={8} />
		<Attribution placement="bottom-right" />
	</Map>
);

export default LocatorPreview;
