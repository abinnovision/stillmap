import type { Color } from "./filter.js";

/**
 * Colours for painted geometry. Keys follow the canonical vocabulary, with a
 * role suffix where one kind needs more than one colour.
 */
export interface GeometryPalette {
	readonly landcover: Color;
	readonly park: Color;
	readonly water: Color;
	readonly waterway: Color;
	readonly building: Color;
	readonly boundary: Color;
	readonly rail: Color;
	readonly path: Color;
	/** The road ribbon itself. */
	readonly road: Color;
	/** The wider line drawn beneath it. Styles without casings ignore this. */
	readonly roadCasing: Color;
	/** Motorway and trunk, which usually sit a shade off the rest. */
	readonly motorway: Color;
}

/** Colours for place labels, by tier rather than by class. */
export interface LabelPalette {
	/** City. */
	readonly primary: Color;
	/** Town and suburb. */
	readonly secondary: Color;
	/** Quarter and neighbourhood. */
	readonly tertiary: Color;
	readonly halo: Color;
}

/**
 * Colours a style does not paint itself, but which the map around it has to
 * match: the surface beneath the tiles and the markers drawn over them.
 */
export interface ChromePalette {
	readonly background: Color;
	readonly marker: Color;
	readonly markerStroke: Color;
}

export interface Palette {
	/** Human-readable identity, for diagnostics and preview tooling. */
	readonly name: string;
	readonly geometry: GeometryPalette;
	readonly label: LabelPalette;
	readonly chrome: ChromePalette;
}

/** A partial recolour. Every group, and every key within it, is optional. */
export interface PaletteOverride {
	readonly name?: string;
	readonly geometry?: Partial<GeometryPalette>;
	readonly label?: Partial<LabelPalette>;
	readonly chrome?: Partial<ChromePalette>;
}

/**
 * Per-key merge. An explicitly `undefined` value counts as absent, which a
 * spread would not do under `exactOptionalPropertyTypes`.
 */
function mergeGroup<T extends object>(
	base: T,
	over: Partial<T> | undefined,
): T {
	if (over === undefined) {
		return base;
	}

	/*
	 * The casts are the price of writing this once for all three groups: an
	 * interface with named readonly keys carries no index signature, so there is
	 * no structural way to say "same keys, some of them present".
	 */
	const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };

	for (const [key, value] of Object.entries(over)) {
		if (value !== undefined) {
			out[key] = value;
		}
	}

	return out as unknown as T;
}

/** Resolves a palette against a partial recolour. Never mutates `base`. */
export function mergePalette(
	base: Palette,
	override?: PaletteOverride,
): Palette {
	if (override === undefined) {
		return base;
	}

	return {
		name: override.name ?? base.name,
		geometry: mergeGroup(base.geometry, override.geometry),
		label: mergeGroup(base.label, override.label),
		chrome: mergeGroup(base.chrome, override.chrome),
	};
}
