/**
 * The canonical vocabulary. One table is the single source of truth: the kind
 * list, the component props, and every schema adapter derive from it.
 */
export interface CanonicalClasses {
	landcover: "wood" | "grass" | "scrub" | "farmland" | "sand" | "rock" | "ice";
	park: "park" | "garden" | "cemetery" | "pitch";
	water: "ocean" | "lake" | "river" | "pond" | "reservoir";
	waterway: "river" | "canal" | "stream" | "ditch";
	building: never;
	road:
		| "motorway"
		| "trunk"
		| "primary"
		| "secondary"
		| "tertiary"
		| "minor"
		| "service";
	rail: "rail" | "subway" | "tram";
	path: "path" | "track" | "footway" | "cycleway";
	boundary: "country" | "region" | "county";
	place: "city" | "town" | "village" | "suburb" | "quarter" | "neighbourhood";
}

export type CanonicalKind = keyof CanonicalClasses;

/**
 * Open per kind: the table drives autocomplete while any string is accepted, so
 * long-tail data and third-party schemas are not locked out. An unmapped class
 * surfaces as a SCHEMA_CLASS_UNMAPPED warning at render time.
 *
 * The conditional stops `never` collapsing to `string`, which keeps `<Building>`
 * from accepting a meaningless class.
 */
export type ClassOf<K extends CanonicalKind> = [CanonicalClasses[K]] extends [
	never,
]
	? never
	: CanonicalClasses[K] | (string & {});

export const CANONICAL_KINDS = [
	"landcover",
	"park",
	"water",
	"waterway",
	"building",
	"road",
	"rail",
	"path",
	"boundary",
	"place",
] as const satisfies readonly CanonicalKind[];

/** Kinds whose features are drawn as filled polygons. */
export const FILL_KINDS = [
	"landcover",
	"park",
	"water",
	"building",
] as const satisfies readonly CanonicalKind[];

/**
 * Kinds whose features are drawn as stroked lines. `water` appears in both
 * lists on purpose: water polygons fill and may also carry an outline.
 */
export const LINE_KINDS = [
	"water",
	"waterway",
	"road",
	"rail",
	"path",
	"boundary",
] as const satisfies readonly CanonicalKind[];
