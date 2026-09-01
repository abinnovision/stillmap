import type {
	CanonicalKind,
	FeatureProperties,
	Filter,
	SchemaQuery,
	SourceLayerBinding,
	TileSchema,
} from "@stillmap/core";

/**
 * Native `class` values backing each canonical class. A canonical class absent
 * from this table is reported as unmapped by the renderer.
 */
const CLASS_MAP: Readonly<
	Record<string, Readonly<Record<string, readonly string[]>>>
> = {
	road: {
		motorway: ["motorway"],
		trunk: ["trunk"],
		primary: ["primary"],
		secondary: ["secondary"],
		tertiary: ["tertiary"],
		minor: ["minor"],
		service: ["service"],
	},
	rail: { rail: ["rail"], subway: ["subway"], tram: ["tram"] },
	path: {
		path: ["path"],
		track: ["track"],
		footway: ["footway"],
		cycleway: ["cycleway"],
	},
	landcover: {
		wood: ["wood"],
		grass: ["grass"],
		scrub: ["scrub"],
		farmland: ["farmland"],
		sand: ["sand"],
		rock: ["rock"],
		ice: ["ice"],
	},
	park: {
		park: ["park"],
		garden: ["garden"],
		cemetery: ["cemetery"],
		pitch: ["pitch"],
	},
	water: {
		ocean: ["ocean"],
		lake: ["lake"],
		river: ["river"],
		pond: ["pond"],
		reservoir: ["reservoir"],
	},
	waterway: {
		river: ["river"],
		canal: ["canal"],
		stream: ["stream"],
		ditch: ["ditch"],
	},
	place: {
		city: ["city"],
		town: ["town"],
		village: ["village"],
		suburb: ["suburb"],
		quarter: ["quarter"],
		neighbourhood: ["neighbourhood"],
	},
};

/** Canonical boundary classes are admin levels in OpenMapTiles. */
const ADMIN_LEVELS: Readonly<Record<string, number>> = {
	country: 2,
	region: 4,
	county: 6,
};

const SOURCE_LAYERS: Readonly<Record<CanonicalKind, string>> = {
	landcover: "landcover",
	park: "park",
	water: "water",
	waterway: "waterway",
	building: "building",
	road: "transportation",
	rail: "transportation",
	path: "transportation",
	boundary: "boundary",
	place: "place",
};

/** Tunnels are hidden geometry; drawing them produces roads through hills. */
const notTunnel = (properties: FeatureProperties): boolean =>
	properties["brunnel"] !== "tunnel";

/**
 * Only Latin ranges are kept. Text outside them rasterises as empty boxes with
 * the fonts these maps normally ship, which is worse than an absent label.
 */
const RENDERABLE_TEXT = /^[\u0020-\u024F\u2010-\u2027]+$/u;

function resolveClasses(
	kind: string,
	requested: readonly string[] | undefined,
): { readonly covered: readonly string[]; readonly native: readonly string[] } {
	const table = CLASS_MAP[kind] ?? {};
	const wanted = requested ?? Object.keys(table);
	const covered: string[] = [];
	const native: string[] = [];

	for (const canonical of wanted) {
		const mapped = table[canonical];

		if (mapped === undefined) {
			continue;
		}

		covered.push(canonical);
		native.push(...mapped);
	}

	return { covered, native };
}

function boundaryBinding(
	classes: readonly string[] | undefined,
): SourceLayerBinding | null {
	const requested = classes ?? Object.keys(ADMIN_LEVELS);
	const levels = requested
		.map((c) => ADMIN_LEVELS[c])
		.filter((level): level is number => level !== undefined);

	if (levels.length === 0) {
		return null;
	}

	const maxLevel = Math.max(...levels);
	const filter: Filter = (properties) =>
		Number(properties["admin_level"]) <= maxLevel &&
		properties["maritime"] !== 1 &&
		properties["maritime"] !== true;

	return {
		sourceLayer: SOURCE_LAYERS.boundary,
		filter,
		classes: requested.filter((c) => ADMIN_LEVELS[c] !== undefined),
	};
}

function bindingFor(query: SchemaQuery): SourceLayerBinding | null {
	const sourceLayer = SOURCE_LAYERS[query.kind];

	if (query.kind === "building") {
		return { sourceLayer };
	}

	if (query.kind === "boundary") {
		return boundaryBinding(query.classes);
	}

	const { covered, native } = resolveClasses(query.kind, query.classes);

	if (covered.length === 0) {
		return null;
	}

	if (query.kind === "water") {
		/*
		 * Water polygons are not reliably classed in every OMT build, so the
		 * binding filters pools out rather than filtering a class list in.
		 */
		return {
			sourceLayer,
			filter: (p) => p["class"] !== "swimming_pool",
			classes: covered,
		};
	}

	const filter: Filter =
		sourceLayer === "transportation"
			? (properties) =>
					notTunnel(properties) && native.includes(String(properties["class"]))
			: { class: native };

	return { sourceLayer, filter, classes: covered };
}

/**
 * The OpenMapTiles schema, used by OpenFreeMap, MapTiler, Stadia, and any
 * self-hosted OpenMapTiles build.
 */
export function openMapTiles(): TileSchema {
	return {
		id: "openmaptiles",
		resolve: (query) => {
			const binding = bindingFor(query);

			return binding === null ? [] : [binding];
		},
		resolveName: (properties, locale) => {
			const candidates = [
				locale === undefined ? undefined : properties[`name:${locale}`],
				properties["name:latin"],
				properties["name"],
			];

			for (const candidate of candidates) {
				if (typeof candidate !== "string" || candidate.length === 0) {
					continue;
				}

				if (!RENDERABLE_TEXT.test(candidate)) {
					continue;
				}

				return candidate;
			}

			return null;
		},
		resolveRank: (properties) => {
			const rank = Number(properties["rank"]);

			return Number.isFinite(rank) ? rank : 100;
		},
	};
}
