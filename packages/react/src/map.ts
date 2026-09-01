import { defineComponent } from "./registry.js";

import type { Color, LngLatLike, TileSource } from "@stillmap/core";
import type { ReactNode } from "react";

export interface MapBase {
	readonly source: TileSource;
	readonly width: number;
	readonly height: number;
	readonly background?: Color;
	/** Preferred language for label text, passed to `schema.resolveName`. */
	readonly locale?: string;
	readonly children?: ReactNode;
}

export interface CenteredView {
	readonly center: LngLatLike;
	readonly zoom: number;
	readonly fit?: never;
}

export interface FittedView {
	/** Derive the view from every marker declared in the tree. */
	readonly fit: "markers";
	readonly padding?:
		| number
		| readonly [top: number, right: number, bottom: number, left: number];
	/** Used when the fitted bounds collapse to a point. */
	readonly fallbackZoom?: number;
	/** Caps how far a tight cluster zooms in. Defaults to the source maximum. */
	readonly maxZoom?: number;
	readonly center?: never;
}

export type MapProps = MapBase & (CenteredView | FittedView);

/**
 * The map itself. Props describe what the map is; render options describe how
 * it is emitted. The walker reads this element's props directly, so
 * `toDeclaration` produces nothing.
 */
export const Map = defineComponent<MapProps>("Map", "map", () => null);
