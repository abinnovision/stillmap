import { Map, Water } from "@stillmap/react";

import { createFixtureSource } from "../../support/fixture-source.js";

import type { LngLat } from "@stillmap/core";
import type { ReactNode } from "react";

interface LocatorProps {
	readonly position: LngLat;
}

const Locator = ({ position }: LocatorProps): ReactNode => (
	<Map
		source={createFixtureSource()}
		center={position}
		zoom={13}
		width={400}
		height={200}
	>
		<Water fill="#E1E4E7" />
	</Map>
);

Locator.PreviewProps = { position: [9.9937, 53.5511] as LngLat };

export default Locator;
