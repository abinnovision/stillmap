import type { MapProps } from "./map.js";
import type { TileSource } from "@stillmap/core";

declare const source: TileSource;

/**
 * The viewport union is checked against the props type rather than through JSX.
 * A `@ts-expect-error` must sit on the line the error is reported on, and
 * Prettier is free to split a JSX element across lines, which silently moves
 * the directive off the offending prop.
 */
export const centered: MapProps = {
	source,
	center: [0, 0],
	zoom: 13,
	width: 100,
	height: 100,
};

export const fitted: MapProps = {
	source,
	fit: "markers",
	padding: 48,
	width: 100,
	height: 100,
};

export const both: MapProps = {
	source,
	/*
	 * With `fit` present the object is matched against FittedView, where
	 * `center?: never`, so TypeScript reports the conflict on this property.
	 */
	// @ts-expect-error center and fit are mutually exclusive.
	center: [0, 0],
	zoom: 1,
	fit: "markers",
	width: 1,
	height: 1,
};

// @ts-expect-error center without zoom is not a complete viewport.
export const halfCentered: MapProps = {
	source,
	center: [0, 0],
	width: 1,
	height: 1,
};
