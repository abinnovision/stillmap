import type { CanonicalKind, ClassOf } from "./canonical.js";
import type { FeatureProperties, Filter } from "./filter.js";
import type { TileCoord } from "./tile-cover.js";

/**
 * A licence condition. The renderer always draws these and offers no way to
 * suppress them.
 */
export interface Attribution {
	readonly text: string;
	readonly url?: string;
}

export type SchemaId =
	"openmaptiles" | "shortbread" | "protomaps" | (string & {});

/** One native source-layer, optionally narrowed, backing a canonical kind. */
export interface SourceLayerBinding {
	readonly sourceLayer: string;
	readonly filter?: Filter;
	/**
	 * Canonical classes this binding covers. Requested classes absent from every
	 * returned binding are reported as SCHEMA_CLASS_UNMAPPED.
	 */
	readonly classes?: readonly string[];
}

export interface SchemaQuery<K extends CanonicalKind = CanonicalKind> {
	readonly kind: K;
	readonly classes?: readonly ClassOf<K>[];
}

/**
 * Normalises one tile schema's layers and properties onto the canonical
 * vocabulary. Layer names do not overlap across schemas: roads are
 * `transportation`, `streets`, or `roads` depending on the provider.
 */
export interface TileSchema {
	readonly id: SchemaId;
	/** An empty result means the schema has no data for that kind. */
	resolve: <K extends CanonicalKind>(
		query: SchemaQuery<K>,
	) => readonly SourceLayerBinding[];
	/** Label text. OpenMapTiles uses `name:latin` then `name`; others differ. */
	resolveName: (
		properties: FeatureProperties,
		locale?: string,
	) => string | null;
	/** Place prominence. Lower sorts first; a missing rank sorts last. */
	resolveRank: (properties: FeatureProperties) => number;
}

export interface OpenContext {
	readonly signal: AbortSignal;
	readonly fetch: typeof fetch;
}

/** A source resolved for one render. */
export interface OpenTileSource {
	readonly minZoom: number;
	readonly maxZoom: number;
	/** Changes when upstream rotates URLs. Part of the tile cache key. */
	readonly version: string;
	/** `null` means legitimately empty: ocean, or outside coverage. */
	fetchTile: (
		coord: TileCoord,
		signal: AbortSignal,
	) => Promise<ArrayBuffer | null>;
}

/**
 * Tiles plus schema plus attribution. Not a URL: a template cannot express
 * PMTiles, and zoom limits belong to the endpoint rather than to a constant.
 */
export interface TileSource {
	readonly id: string;
	readonly schema: TileSchema;
	readonly attribution: readonly Attribution[];
	open: (context: OpenContext) => Promise<OpenTileSource>;
}

/** Identity helper giving adapter authors inference and excess-property checks. */
export function defineTileSource(definition: TileSource): TileSource {
	return definition;
}
