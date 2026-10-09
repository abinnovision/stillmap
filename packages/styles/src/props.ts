import type { PaletteOverride } from "@stillmap/core";
import type { ReactNode } from "react";

/** The prop surface every style in this package shares. */
export interface StyleProps {
	/** A partial recolour, merged over the style's own palette. */
	readonly palette?: PaletteOverride;
	/** Emit the place-label hierarchy. Defaults to `true`. */
	readonly labels?: boolean;
	/**
	 * The family for every label. Omit it and the renderer uses the first font
	 * the map declares, which is almost always what you want; name one only when
	 * the map declares more than one.
	 */
	readonly fontFamily?: string;
	/** Painted just below the first road layer, so roads cross over it. */
	readonly belowRoads?: ReactNode;
	/** Painted just below the buildings. */
	readonly belowBuildings?: ReactNode;
}
