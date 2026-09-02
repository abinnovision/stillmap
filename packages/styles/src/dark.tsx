import { mergePalette } from "@stillmap/core";

import { Contrast } from "./contrast.js";

import type { StyleProps } from "./props.js";
import type { Palette } from "@stillmap/core";
import type { ReactNode } from "react";

/**
 * The same structure as `LIGHT` with the contrast inverted rather than the
 * colours negated: the ground stays a shade above true black so buildings and
 * water still separate from it, and the road network is the lightest thing on
 * the map.
 */
export const DARK: Palette = {
	name: "dark",
	geometry: {
		landcover: "#171A1F",
		park: "#171A1F",
		water: "#0E1319",
		waterway: "#0E1319",
		building: "#1C1F25",
		boundary: "#33383F",
		rail: "#2A2E35",
		path: "#23272D",
		road: "#2E333A",
		roadCasing: "#1A1D22",
		motorway: "#3A4048",
	},
	label: {
		primary: "#C8CCD2",
		secondary: "#969CA5",
		tertiary: "#767C85",
		halo: "#14161A",
	},
	chrome: {
		background: "#14161A",
		marker: "#7FA8C9",
		markerStroke: "#14161A",
	},
};

/** Inverted contrast on a dark ground. */
export const Dark = ({
	palette,
	labels = true,
	fontFamily,
}: StyleProps = {}): ReactNode => (
	<Contrast
		palette={mergePalette(DARK, palette)}
		labels={labels}
		{...(fontFamily === undefined ? {} : { fontFamily })}
	/>
);
