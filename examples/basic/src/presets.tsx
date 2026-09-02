import { Attribution, Font, Map, Pin } from "@stillmap/react";
import { openFreeMap } from "@stillmap/sources";
import { Dark, DARK, Light, LIGHT, Neutral, NEUTRAL } from "@stillmap/styles";

import { INTER } from "./assets.ts";

import type { LngLat, Palette, TileSource } from "@stillmap/core";
import type { ReactNode } from "react";

export type PresetName = "dark" | "light" | "neutral";

/** Every shipped style, in the order they read best side by side. */
export const PRESET_NAMES: readonly PresetName[] = ["neutral", "light", "dark"];

const PRESETS: Record<
	PresetName,
	{ readonly Style: () => ReactNode; readonly palette: Palette }
> = {
	neutral: { Style: Neutral, palette: NEUTRAL },
	light: { Style: Light, palette: LIGHT },
	dark: { Style: Dark, palette: DARK },
};

export interface PresetCardProps {
	readonly preset: PresetName;
	readonly position: LngLat;
	readonly source?: TileSource;
}

/**
 * One frame per style, identical in every other respect, so the three read as
 * a comparison rather than three separate maps.
 *
 * Background and pin come from the palette. That handshake is the whole reason
 * a style exports one: neither is the style's to draw.
 */
export const PresetCard = ({
	preset,
	position,
	source = openFreeMap(),
}: PresetCardProps): ReactNode => {
	const { Style, palette } = PRESETS[preset];

	return (
		<Map
			source={source}
			center={position}
			zoom={13}
			width={1200}
			height={300}
			background={palette.chrome.background}
		>
			<Font family="Inter" file={INTER} />

			<Style />

			<Pin position={position} fill={palette.chrome.marker} padding={8} />
			<Attribution placement="bottom-right" />
		</Map>
	);
};
