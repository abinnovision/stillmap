import { mergePalette } from "@stillmap/core";
import {
	Boundary,
	Building,
	Landcover,
	Park,
	Path,
	Rail,
	Road,
	Water,
	Waterway,
} from "@stillmap/react";

import { PlaceLabelBlock } from "./labels.js";
import { step } from "./ramp.js";

import type { LabelScale } from "./labels.js";
import type { StyleProps } from "./props.js";
import type { Palette } from "@stillmap/core";
import type { ReactNode } from "react";

/**
 * A quiet warm grey. Nothing in it competes with what you draw on top, which is
 * what a locator or a thumbnail wants.
 *
 * `roadCasing` is unused: Neutral draws roads as a single pass. It is set to
 * the background so a recolour that turns casings on has somewhere to start.
 */
export const NEUTRAL: Palette = {
	name: "neutral",
	geometry: {
		landcover: "#EDEFEB",
		park: "#EBEEE9",
		water: "#E1E4E7",
		waterway: "#E1E4E7",
		building: "#E8E7E4",
		boundary: "#D6D6D1",
		rail: "#DCDBD7",
		path: "#E4E3E0",
		road: "#FFFFFF",
		roadCasing: "#F5F5F3",
		motorway: "#FCFBF9",
	},
	label: {
		primary: "#6E6E68",
		secondary: "#6E6E68",
		tertiary: "#6E6E68",
		halo: "#F5F5F3",
	},
	chrome: {
		background: "#F5F5F3",
		marker: "#9DB59D",
		markerStroke: "#FFFFFF",
	},
};

const WIDTH = {
	minor: step([[15, 1]], 1.8),
	secondary: step(
		[
			[13, 1.4],
			[15, 2],
		],
		2.8,
	),
	primary: step(
		[
			[13, 1.8],
			[15, 2.6],
		],
		3.6,
	),
	motorway: step(
		[
			[13, 2.2],
			[15, 3.2],
		],
		4.6,
	),
} as const;

const SCALE: LabelScale = {
	primary: {
		fontSize: 15,
		fontWeight: 600,
		letterSpacing: 0.3,
		priority: 0,
	},
	secondary: {
		fontSize: 13,
		fontWeight: 600,
		letterSpacing: 0.26,
		priority: 1,
	},
	tertiary: {
		fontSize: 11.5,
		fontWeight: 500,
		letterSpacing: 0.58,
		priority: 2,
	},
};

/** Ordered back to front: document order is paint order. */
export const Neutral = ({
	palette,
	labels = true,
	fontFamily,
}: StyleProps = {}): ReactNode => {
	const { geometry, label } = mergePalette(NEUTRAL, palette);

	return (
		<>
			<Landcover
				classes={["wood", "grass", "scrub", "farmland"]}
				fill={geometry.landcover}
				minZoom={10}
			/>
			<Park fill={geometry.park} minZoom={11} />
			<Water fill={geometry.water} />
			<Waterway
				classes="river"
				stroke={geometry.waterway}
				width={1.6}
				minZoom={11}
			/>
			<Waterway
				classes={["canal", "stream"]}
				stroke={geometry.waterway}
				width={0.9}
				minZoom={13}
			/>
			<Building fill={geometry.building} minZoom={15} />
			<Boundary
				classes={["country", "region"]}
				stroke={geometry.boundary}
				width={1}
				dash={[4, 3]}
			/>
			<Path
				classes={["path", "track"]}
				stroke={geometry.path}
				width={0.7}
				dash={[2, 2]}
				minZoom={15}
			/>
			<Rail stroke={geometry.rail} width={0.9} dash={[5, 4]} minZoom={13} />
			<Road
				classes={["minor", "service"]}
				stroke={geometry.road}
				width={WIDTH.minor}
				minZoom={14}
			/>
			<Road
				classes={["secondary", "tertiary"]}
				stroke={geometry.road}
				width={WIDTH.secondary}
				minZoom={11}
			/>
			<Road
				classes="primary"
				stroke={geometry.road}
				width={WIDTH.primary}
				minZoom={9}
			/>
			<Road
				classes={["motorway", "trunk"]}
				stroke={geometry.motorway}
				width={WIDTH.motorway}
			/>

			{labels ? (
				<PlaceLabelBlock
					palette={label}
					scale={SCALE}
					{...(fontFamily === undefined ? {} : { fontFamily })}
				/>
			) : null}
		</>
	);
};
