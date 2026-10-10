import { worldSize } from "@stillmap/core";
import {
	Attribution,
	Building,
	Fill,
	Font,
	Map,
	Marker,
	Park,
	PlaceLabels,
	Rail,
	Road,
	Water,
	Waterway,
} from "@stillmap/react";
import { openFreeMap } from "@stillmap/sources";

import { INTER } from "./assets.ts";
import { POIS, PROPERTY, STATIONS } from "./property-data.ts";

import type { PoiCategory } from "./property-data.ts";
import type { TileSource } from "@stillmap/core";
import type { ReactNode } from "react";

const BACKGROUND = "#F6F4EF";
const ACCENT = "#2F7F7A";
const ACCENT_DARK = "#1F4F4C";

/** Walking rings around the property, at roughly 80 metres a minute. */
const RINGS = [
	{ metres: 400, tag: "5 min" },
	{ metres: 800, tag: "10 min" },
] as const;

const EARTH_CIRCUMFERENCE = 40_075_016.686;

/** Web Mercator ground resolution, in metres per CSS pixel. */
function metresPerPixel(latitude: number, zoom: number): number {
	return (
		(EARTH_CIRCUMFERENCE * Math.cos((latitude * Math.PI) / 180)) /
		worldSize(zoom)
	);
}

/** Legend colours and names. A listing page renders its legend from these. */
export const CATEGORIES: Readonly<
	Record<PoiCategory, { readonly label: string; readonly color: string }>
> = {
	grocery: { label: "Groceries", color: "#E0A63B" },
	pharmacy: { label: "Pharmacies", color: "#D9574A" },
	school: { label: "Schools", color: "#3C8DBC" },
	kindergarten: { label: "Kindergartens", color: "#C46FA8" },
	cafe: { label: "Cafés", color: "#7FA650" },
	doctor: { label: "Doctors", color: "#6B5FB5" },
};

export interface PropertyProps {
	readonly source?: TileSource;
	readonly width?: number;
	readonly height?: number;
	readonly zoom?: number;
}

/**
 * A listing map: one property, and what is within walking distance of it.
 *
 * The base is a hand-built style rather than a preset, quiet enough that the
 * points of interest carry the colour. Rings are markers sized from the
 * ground resolution, so they stay true to distance at any zoom. They do not
 * reserve their box, which would push every label out of the walking radius.
 */
export const Property = ({
	source = openFreeMap(),
	width = 900,
	height = 400,
	zoom = 14,
}: PropertyProps): ReactNode => {
	const resolution = metresPerPixel(PROPERTY.position[1], zoom);

	return (
		<Map
			source={source}
			center={PROPERTY.position}
			zoom={zoom}
			width={width}
			height={height}
			background={BACKGROUND}
		>
			<Font family="Inter" file={INTER} />

			<Fill layer="landuse" filter={{ class: "residential" }} fill="#EEEBE4" />
			<Park fill="#E2EAD9" />
			<Water fill="#D3E2E5" />
			<Waterway stroke="#D3E2E5" width={1.2} />
			<Building fill="#E8E4DC" minZoom={14} />
			<Road classes={["minor", "service"]} stroke="#FFFFFF" width={1} />
			<Road classes={["secondary", "tertiary"]} stroke="#FFFFFF" width={2} />
			<Road
				classes={["primary", "trunk", "motorway"]}
				stroke="#FFFFFF"
				width={3}
			/>
			<Rail classes="rail" stroke={ACCENT} width={1.6} opacity={0.8} />

			<PlaceLabels
				classes={["suburb", "quarter"]}
				color={ACCENT_DARK}
				halo={BACKGROUND}
				haloWidth={2}
				fontSize={12}
				fontWeight={700}
				letterSpacing={1.2}
			/>

			{RINGS.map(({ metres, tag }) => {
				const radius = metres / resolution;
				const size = 2 * radius + 40;
				const centre = size / 2;

				return (
					<Marker
						key={metres}
						position={PROPERTY.position}
						size={[size, size]}
						reserve={false}
					>
						<circle
							cx={centre}
							cy={centre}
							r={radius}
							fill="none"
							stroke={ACCENT}
							strokeWidth="1.2"
							strokeDasharray="4 3"
						/>
						<rect
							x={centre - 20}
							y={centre - radius - 7}
							width="40"
							height="14"
							rx="7"
							fill={BACKGROUND}
							stroke={ACCENT}
						/>
						<text
							x={centre}
							y={centre - radius + 3}
							textAnchor="middle"
							fontFamily="Inter"
							fontSize="9"
							fontWeight="600"
							fill={ACCENT_DARK}
						>
							{tag}
						</text>
					</Marker>
				);
			})}

			{POIS.map((poi) => (
				<Marker
					key={poi.position.join()}
					position={poi.position}
					size={[10, 10]}
				>
					<circle
						cx="5"
						cy="5"
						r="4"
						fill={CATEGORIES[poi.category].color}
						stroke="#FFFFFF"
						strokeWidth="1.5"
					/>
				</Marker>
			))}

			{STATIONS.map((station) => (
				<Marker key={station.join()} position={station} size={[18, 18]}>
					<circle cx="9" cy="9" r="8.5" fill={ACCENT_DARK} />
					<rect x="5" y="3.5" width="8" height="8.5" rx="2" fill="#FFFFFF" />
					<rect x="6.5" y="5" width="5" height="2.5" fill={ACCENT_DARK} />
					<path
						d="M6.5 14.5L8 12M11.5 14.5L10 12"
						stroke="#FFFFFF"
						strokeWidth="1.2"
					/>
				</Marker>
			))}

			<Marker
				position={PROPERTY.position}
				size={[132, 44]}
				anchor="bottom"
				padding={4}
			>
				<rect width="132" height="34" rx="6" fill={ACCENT_DARK} />
				<path d="M60 34L66 44L72 34Z" fill={ACCENT_DARK} />
				<path
					d="M11 18L18 11.5L25 18V25H20.5V20.5H15.5V25H11Z"
					fill="#FFFFFF"
				/>
				<text
					x="33"
					y="22"
					fontFamily="Inter"
					fontSize="14"
					fontWeight="600"
					fill="#FFFFFF"
				>
					{PROPERTY.name}
				</text>
			</Marker>

			<Attribution placement="bottom-left" />
		</Map>
	);
};
