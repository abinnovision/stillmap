import {
	Boundary,
	Fill,
	Building,
	Landcover,
	Park,
	PlaceLabels,
	Rail,
	Road,
	Water,
	Waterway,
} from "@stillmap/react";

import type { ReactNode } from "react";

/**
 * Palette sampled from a Mapbox light-v11 raster rather than guessed. The text
 * greys are the darkest pixel in each label, so they are the fill rather than
 * an anti-aliased average.
 */
export const LIGHT = {
	background: "#F8F8F7",
	landuse: "#EBEBED",
	park: "#EBEBED",
	water: "#DCE3E8",
	road: "#FFFFFF",
	casing: "#EFEFEE",
	building: "#E7E7E9",
	rail: "#E4E4E5",
	boundary: "#D3D3D5",
	city: "#676767",
	suburb: "#9E9E9F",
	quarter: "#B0B1B2",
} as const;

/**
 * A partial reconstruction of Mapbox light-v11, drawn from OpenFreeMap tiles.
 *
 * The signature of the style is inverted contrast: roads are white and the
 * ground is grey, so the network reads as negative space. Everything else is
 * held within a few percent of the background.
 */
export const MapboxLight = (): ReactNode => (
	<>
		{/*
		 * Institutional and industrial land only. Residential is deliberately not
		 * painted: it covers most of a city, and filling it inverts the balance
		 * this style depends on, leaving the roads with nothing to read against.
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
			fill={LIGHT.landuse}
		/>

		{/*
		 * Wood and grass only. Farmland and scrub are large contiguous fields, and
		 * painting them swamps the edges of a city view.
		 */}
		<Landcover classes={["wood", "grass"]} fill={LIGHT.park} />
		<Park classes={["park", "garden", "cemetery", "pitch"]} fill={LIGHT.park} />
		<Building fill={LIGHT.building} minZoom={14} />

		<Water fill={LIGHT.water} />
		<Waterway classes={["river", "canal"]} stroke={LIGHT.water} width={1.4} />

		<Boundary
			classes={["country", "region"]}
			stroke={LIGHT.boundary}
			width={1}
			dash={[3, 3]}
		/>

		<Rail
			classes="rail"
			stroke={LIGHT.rail}
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
			stroke={LIGHT.casing}
			width={(z) => (z < 12 ? 2.8 : z < 14 ? 4 : 6)}
		/>
		<Road
			classes="primary"
			stroke={LIGHT.casing}
			width={(z) => (z < 12 ? 2.2 : z < 14 ? 3.2 : 4.6)}
			minZoom={10}
		/>

		<Road
			classes={["minor", "service"]}
			stroke={LIGHT.road}
			width={(z) => (z < 14 ? 0.9 : 1.8)}
			minZoom={12}
		/>
		<Road
			classes="tertiary"
			stroke={LIGHT.road}
			width={(z) => (z < 14 ? 1.2 : 2.2)}
			minZoom={11}
		/>
		<Road
			classes="secondary"
			stroke={LIGHT.road}
			width={(z) => (z < 12 ? 1.2 : z < 14 ? 1.7 : 2.6)}
			minZoom={10}
		/>
		<Road
			classes="primary"
			stroke={LIGHT.road}
			width={(z) => (z < 12 ? 1.4 : z < 14 ? 2.1 : 3.2)}
			minZoom={9}
		/>
		<Road
			classes={["motorway", "trunk"]}
			stroke={LIGHT.road}
			width={(z) => (z < 12 ? 2 : z < 14 ? 3 : 4.6)}
		/>
	</>
);

/**
 * The label hierarchy, separate from the paint so a map can take one without
 * the other. Collision runs once across every element; `priority` breaks ties.
 */
export const MapboxLightLabels = (): ReactNode => (
	<>
		<PlaceLabels
			classes="city"
			color={LIGHT.city}
			halo={LIGHT.background}
			haloWidth={1.6}
			fontSize={19}
			fontWeight={600}
			maxCount={2}
			priority={0}
		/>
		<PlaceLabels
			classes={["town", "suburb"]}
			color={LIGHT.suburb}
			halo={LIGHT.background}
			haloWidth={1.4}
			fontSize={14}
			fontWeight={500}
			maxCount={8}
			priority={1}
		/>
		<PlaceLabels
			classes={["quarter", "neighbourhood"]}
			color={LIGHT.quarter}
			halo={LIGHT.background}
			haloWidth={1.2}
			fontSize={10.5}
			fontWeight={500}
			letterSpacing={0.9}
			maxCount={10}
			priority={2}
		/>
	</>
);
