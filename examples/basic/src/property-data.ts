import type { LngLat } from "@stillmap/core";

const EARTH_RADIUS = 6_371_008.8;

function radians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

/** Great-circle distance in metres. */
function distance(from: LngLat, to: LngLat): number {
	const dLat = radians(to[1] - from[1]);
	const dLng = radians(to[0] - from[0]);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(radians(from[1])) *
			Math.cos(radians(to[1])) *
			Math.sin(dLng / 2) ** 2;

	return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(a));
}

export type PoiCategory =
	"grocery" | "pharmacy" | "school" | "kindergarten" | "cafe" | "doctor";

export interface Poi {
	readonly category: PoiCategory;
	readonly position: LngLat;
}

export interface Nearest {
	readonly category: PoiCategory;
	/** Straight-line distance in metres, rounded to the nearest 50. */
	readonly distance: number;
}

/** A fictional apartment building in Hamburg St. Georg. */
export const PROPERTY = {
	name: "Lindenhof 12",
	position: [10.0142, 53.5551],
} as const satisfies { readonly name: string; readonly position: LngLat };

/** Rapid transit stations in walking distance. */
export const STATIONS: readonly LngLat[] = [
	[10.00644, 53.5532],
	[10.01889, 53.55654],
];

/**
 * Taken once from OpenStreetMap (c) OpenStreetMap contributors, ODbL, and
 * committed so the example renders without a lookup.
 */
export const POIS: readonly Poi[] = [
	{ category: "grocery", position: [10.00988, 53.5566] },
	{ category: "grocery", position: [10.01709, 53.55523] },
	{ category: "grocery", position: [10.01193, 53.55323] },
	{ category: "pharmacy", position: [10.01272, 53.55362] },
	{ category: "pharmacy", position: [10.01033, 53.55693] },
	{ category: "pharmacy", position: [10.01768, 53.55625] },
	{ category: "school", position: [10.01174, 53.55617] },
	{ category: "school", position: [10.01692, 53.5577] },
	{ category: "school", position: [10.01871, 53.55126] },
	{ category: "kindergarten", position: [10.01053, 53.55582] },
	{ category: "kindergarten", position: [10.01813, 53.55505] },
	{ category: "kindergarten", position: [10.01346, 53.55788] },
	{ category: "cafe", position: [10.01262, 53.55493] },
	{ category: "cafe", position: [10.00823, 53.55597] },
	{ category: "cafe", position: [10.01702, 53.55336] },
	{ category: "doctor", position: [10.0099, 53.55809] },
	{ category: "doctor", position: [10.01076, 53.55257] },
	{ category: "doctor", position: [10.01225, 53.55832] },
];

/**
 * The closest point of interest per category, in first-seen category order.
 * The listing text and the map read from the same data, so they agree.
 */
export function nearest(
	from: LngLat,
	pois: readonly Poi[],
): readonly Nearest[] {
	const closest = new Map<PoiCategory, number>();

	for (const poi of pois) {
		const metres = distance(from, poi.position);
		const current = closest.get(poi.category);

		if (current === undefined || metres < current) {
			closest.set(poi.category, metres);
		}
	}

	return [...closest].map(([category, metres]) => ({
		category,
		distance: Math.round(metres / 50) * 50,
	}));
}
