import { Map } from "@stillmap/react";

import { createFixtureSource } from "../../../support/fixture-source.js";

import type { ReactNode } from "react";

/** Proves nested discovery, and that a template needs no PreviewProps. */
const Inset = (): ReactNode => (
	<Map
		source={createFixtureSource()}
		center={[9.9937, 53.5511]}
		zoom={13}
		width={120}
		height={120}
	/>
);

export default Inset;
