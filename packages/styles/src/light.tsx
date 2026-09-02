import { mergePalette } from "@stillmap/core";

import { Contrast } from "./contrast.js";

import type { StyleProps } from "./props.js";
import type { Palette } from "@stillmap/core";
import type { ReactNode } from "react";

/**
 * A pale grey ground with a white road network. The text greys are the darkest
 * pixel of a label rather than an anti-aliased average, so they hold up once
 * the halo is applied.
 */
export const LIGHT: Palette = {
	name: "light",
	geometry: {
		landcover: "#EBEBED",
		park: "#EBEBED",
		water: "#DCE3E8",
		waterway: "#DCE3E8",
		building: "#E7E7E9",
		boundary: "#D3D3D5",
		rail: "#E4E4E5",
		path: "#EFEFEE",
		road: "#FFFFFF",
		roadCasing: "#EFEFEE",
		motorway: "#FFFFFF",
	},
	label: {
		primary: "#676767",
		secondary: "#9E9E9F",
		tertiary: "#B0B1B2",
		halo: "#F8F8F7",
	},
	chrome: {
		background: "#F8F8F7",
		marker: "#668CAA",
		markerStroke: "#FFFFFF",
	},
};

/** Inverted contrast on a light ground. Reads well under dense overlays. */
export const Light = ({
	palette,
	labels = true,
	fontFamily,
}: StyleProps = {}): ReactNode => (
	<Contrast
		palette={mergePalette(LIGHT, palette)}
		labels={labels}
		{...(fontFamily === undefined ? {} : { fontFamily })}
	/>
);
