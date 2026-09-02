import {
	Boundary,
	Building,
	Fill,
	Landcover,
	Park,
	Rail,
	Road,
	Water,
	Waterway,
} from "@stillmap/react";

import { PlaceLabelBlock } from "./labels.js";
import { step } from "./ramp.js";

import type { LabelScale } from "./labels.js";
import type { Palette } from "@stillmap/core";
import type { ReactNode } from "react";

export interface ContrastProps {
	readonly palette: Palette;
	readonly labels: boolean;
	readonly fontFamily?: string;
}

const WIDTH = {
	motorwayCasing: step(
		[
			[12, 2.8],
			[14, 4],
		],
		6,
	),
	primaryCasing: step(
		[
			[12, 2.2],
			[14, 3.2],
		],
		4.6,
	),
	minor: step([[14, 0.9]], 1.8),
	tertiary: step([[14, 1.2]], 2.2),
	secondary: step(
		[
			[12, 1.2],
			[14, 1.7],
		],
		2.6,
	),
	primary: step(
		[
			[12, 1.4],
			[14, 2.1],
		],
		3.2,
	),
	motorway: step(
		[
			[12, 2],
			[14, 3],
		],
		4.6,
	),
} as const;

const SCALE: LabelScale = {
	primary: {
		fontSize: 19,
		fontWeight: 600,
		haloWidth: 1.6,
		maxCount: 2,
		priority: 0,
	},
	secondary: {
		fontSize: 14,
		fontWeight: 500,
		haloWidth: 1.4,
		maxCount: 8,
		priority: 1,
	},
	tertiary: {
		fontSize: 10.5,
		fontWeight: 500,
		letterSpacing: 0.9,
		haloWidth: 1.2,
		maxCount: 10,
		priority: 2,
	},
};

/**
 * The inverted-contrast structure: the road network is painted lighter than the
 * ground it crosses, so it reads as negative space rather than as drawn lines.
 * Everything else is held within a few percent of the background.
 *
 * Shared by `Light` and `Dark`, which differ only in palette. It is internal on
 * purpose: a style that takes a whole `Palette` is a style-spec API, and this
 * package does not have one.
 */
export const Contrast = ({
	palette,
	labels,
	fontFamily,
}: ContrastProps): ReactNode => {
	const { geometry, label } = palette;

	return (
		<>
			{/*
			 * Institutional and industrial land only. Residential is deliberately
			 * not painted: it covers most of a city, and filling it inverts the
			 * balance this style depends on, leaving the roads with nothing to read
			 * against.
			 *
			 * `landuse` has no canonical kind, its classes being administrative
			 * rather than physical, so this is the raw escape hatch.
			 */}
			<Fill
				layer="landuse"
				filter={{
					class: [
						"commercial",
						"industrial",
						"retail",
						"school",
						"university",
						"hospital",
						"stadium",
					],
				}}
				fill={geometry.landcover}
			/>

			{/*
			 * Wood and grass only. Farmland and scrub are large contiguous fields,
			 * and painting them swamps the edges of a city view.
			 */}
			<Landcover classes={["wood", "grass"]} fill={geometry.landcover} />
			<Park
				classes={["park", "garden", "cemetery", "pitch"]}
				fill={geometry.park}
			/>
			<Building fill={geometry.building} minZoom={14} />

			<Water fill={geometry.water} />
			<Waterway
				classes={["river", "canal"]}
				stroke={geometry.waterway}
				width={1.4}
			/>

			<Boundary
				classes={["country", "region"]}
				stroke={geometry.boundary}
				width={1}
				dash={[3, 3]}
			/>

			<Rail
				classes="rail"
				stroke={geometry.rail}
				width={0.9}
				dash={[4, 3]}
				minZoom={11}
			/>

			{/*
			 * Casings are two passes rather than a property: a wider line under a
			 * narrower one. Document order is paint order, so the pair has to stay
			 * adjacent.
			 */}
			<Road
				classes={["motorway", "trunk"]}
				stroke={geometry.roadCasing}
				width={WIDTH.motorwayCasing}
			/>
			<Road
				classes="primary"
				stroke={geometry.roadCasing}
				width={WIDTH.primaryCasing}
				minZoom={9}
			/>

			<Road
				classes={["minor", "service"]}
				stroke={geometry.road}
				width={WIDTH.minor}
				minZoom={12}
			/>
			<Road
				classes="tertiary"
				stroke={geometry.road}
				width={WIDTH.tertiary}
				minZoom={11}
			/>
			<Road
				classes="secondary"
				stroke={geometry.road}
				width={WIDTH.secondary}
				minZoom={10}
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
