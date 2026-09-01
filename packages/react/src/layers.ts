import { defineComponent } from "./registry.js";

import type { StillmapComponent } from "./registry.js";
import type {
	CanonicalKind,
	ClassOf,
	Color,
	Filter,
	LayerDeclaration,
	Zoomable,
} from "@stillmap/core";

export interface LayerProps {
	readonly minZoom?: number;
	readonly maxZoom?: number;
}

export interface FillStyle {
	readonly fill?: Zoomable<Color>;
	readonly fillOpacity?: Zoomable<number>;
}

export interface StrokeStyle {
	readonly stroke?: Zoomable<Color>;
	readonly width?: Zoomable<number>;
	readonly dash?: Zoomable<readonly number[]>;
	readonly opacity?: Zoomable<number>;
}

/** A layer addressed by canonical kind and resolved through the source schema. */
export interface CanonicalProps<K extends CanonicalKind> extends LayerProps {
	readonly classes?: ClassOf<K> | readonly ClassOf<K>[];
	/** Extra narrowing on top of the schema binding. Source-specific. */
	readonly filter?: Filter;
}

/** A layer addressed by native source-layer name. Bypasses the schema. */
export interface RawProps extends LayerProps {
	readonly layer: string;
	readonly filter?: Filter;
}

type AnyProps = Readonly<Record<string, unknown>>;

const FILL_KEYS = ["fill", "fillOpacity"] as const;
const STROKE_KEYS = ["stroke", "width", "dash", "opacity"] as const;
const BOUND_KEYS = ["minZoom", "maxZoom", "filter"] as const;

/**
 * Copies only the keys that are actually present.
 * `exactOptionalPropertyTypes` rejects an explicit `undefined`, and an absent
 * key keeps declarations comparable in tests.
 */
function pick(
	props: AnyProps,
	keys: readonly string[],
): Partial<LayerDeclaration> {
	return Object.fromEntries(
		keys
			.filter((key) => props[key] !== undefined)
			.map((key) => [key, props[key]]),
	);
}

type ClassInput = string | readonly string[] | undefined;

function toClassList(value: ClassInput): readonly string[] | undefined {
	if (value === undefined) {
		return undefined;
	}

	return typeof value === "string" ? [value] : value;
}

function canonicalLayer<K extends CanonicalKind, P extends CanonicalProps<K>>(
	displayName: string,
	kind: K,
	geometry: "fill" | "line",
): StillmapComponent<P> {
	const paintKeys = geometry === "fill" ? FILL_KEYS : STROKE_KEYS;

	return defineComponent<P>(displayName, "layer", (props): LayerDeclaration => {
		const record = props as AnyProps;
		const classes = toClassList(record["classes"] as ClassInput);

		return {
			kind: geometry,
			target: {
				mode: "canonical",
				kind,
				...(classes === undefined ? {} : { classes }),
			},
			...pick(record, BOUND_KEYS),
			...pick(record, paintKeys),
		};
	});
}

function rawLayer<P extends RawProps>(
	displayName: string,
	geometry: "fill" | "line",
): StillmapComponent<P> {
	const paintKeys = geometry === "fill" ? FILL_KEYS : STROKE_KEYS;

	return defineComponent<P>(displayName, "layer", (props): LayerDeclaration => {
		const record = props as AnyProps;

		return {
			kind: geometry,
			target: { mode: "raw", sourceLayer: props.layer },
			...pick(record, BOUND_KEYS),
			...pick(record, paintKeys),
		};
	});
}

export const Landcover = canonicalLayer<
	"landcover",
	CanonicalProps<"landcover"> & FillStyle
>("Landcover", "landcover", "fill");

export const Park = canonicalLayer<"park", CanonicalProps<"park"> & FillStyle>(
	"Park",
	"park",
	"fill",
);

export const Water = canonicalLayer<
	"water",
	CanonicalProps<"water"> & FillStyle
>("Water", "water", "fill");

export const Building = canonicalLayer<
	"building",
	CanonicalProps<"building"> & FillStyle
>("Building", "building", "fill");

export const Waterway = canonicalLayer<
	"waterway",
	CanonicalProps<"waterway"> & StrokeStyle
>("Waterway", "waterway", "line");

export const Road = canonicalLayer<
	"road",
	CanonicalProps<"road"> & StrokeStyle
>("Road", "road", "line");

export const Rail = canonicalLayer<
	"rail",
	CanonicalProps<"rail"> & StrokeStyle
>("Rail", "rail", "line");

export const Path = canonicalLayer<
	"path",
	CanonicalProps<"path"> & StrokeStyle
>("Path", "path", "line");

export const Boundary = canonicalLayer<
	"boundary",
	CanonicalProps<"boundary"> & StrokeStyle
>("Boundary", "boundary", "line");

/** Raw escape hatch: a filled layer addressed by native source-layer name. */
export const Fill = rawLayer<RawProps & FillStyle>("Fill", "fill");

/** Raw escape hatch: a stroked layer addressed by native source-layer name. */
export const Line = rawLayer<RawProps & StrokeStyle>("Line", "line");
