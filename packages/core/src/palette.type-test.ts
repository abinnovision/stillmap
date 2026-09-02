import type { Palette, PaletteOverride } from "./palette.js";

/** An override may name nothing at all. */
export const empty: PaletteOverride = {};

/** ...or one key of one group, without restating its siblings. */
export const single: PaletteOverride = { geometry: { water: "#FFFFFF" } };

// @ts-expect-error An unknown key is a typo, not an extension point.
export const unknown: PaletteOverride = { geometry: { ocean: "#FFFFFF" } };

declare const partial: PaletteOverride;

// @ts-expect-error A partial recolour is not a palette.
export const notAPalette: Palette = partial;
