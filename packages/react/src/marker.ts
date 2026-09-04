import { toLngLat } from "@stillmap/core";
import { createElement } from "react";

import { renderOverlay } from "./marker-markup.js";
import { defineComponent } from "./registry.js";

import type {
	Color,
	LngLatLike,
	MarkerAnchor,
	MarkerDeclaration,
} from "@stillmap/core";
import type { ReactNode } from "react";

export interface MarkerProps {
	readonly position: LngLatLike;
	/** CSS pixels. Required: there is no layout engine to measure children. */
	readonly size: readonly [width: number, height: number];
	/** Which point of the box lands on the coordinate. Defaults to `"center"`. */
	readonly anchor?: MarkerAnchor;
	readonly offset?: readonly [x: number, y: number];
	/** Keep-clear margin used by label collision. */
	readonly padding?: number;
	/**
	 * Whether the marker claims its box against label collision. Defaults to
	 * true: a label under the marker relocates nearby rather than being
	 * covered. Set it false to draw the marker over labels instead.
	 */
	readonly reserve?: boolean;
	readonly children: ReactNode;
}

export const Marker = defineComponent<MarkerProps>(
	"Marker",
	"marker",
	(props, context): MarkerDeclaration => ({
		kind: "marker",
		position: toLngLat(props.position),
		size: props.size,
		anchor: props.anchor ?? "center",
		...(props.offset === undefined ? {} : { offset: props.offset }),
		...(props.padding === undefined ? {} : { padding: props.padding }),
		...(props.reserve === undefined ? {} : { reserve: props.reserve }),
		markup: renderOverlay(props.children, context.warn),
	}),
);

export interface PinProps {
	readonly position: LngLatLike;
	readonly fill?: Color;
	readonly stroke?: Color;
	/** Defaults to `[28, 36]`. */
	readonly size?: readonly [width: number, height: number];
	/** Defaults to `"bottom"`. */
	readonly anchor?: MarkerAnchor;
	readonly padding?: number;
	/** See `MarkerProps.reserve`. Defaults to true. */
	readonly reserve?: boolean;
}

const PIN_SIZE: readonly [number, number] = [28, 36];
const PIN_PATH = "M14 36C14 36 27 20 27 13A13 13 0 1 0 1 13C1 20 14 36 14 36Z";

/**
 * A minimal teardrop marker. Positioned as a marker in its own right, because a
 * child cannot learn its box size without context, which the walker does not
 * support.
 */
export const Pin = defineComponent<PinProps>(
	"Pin",
	"marker",
	(props, context): MarkerDeclaration => {
		const size = props.size ?? PIN_SIZE;
		const scaleX = size[0] / PIN_SIZE[0];
		const scaleY = size[1] / PIN_SIZE[1];
		const scaled = scaleX !== 1 || scaleY !== 1;

		const glyph = createElement(
			"g",
			scaled
				? { transform: `scale(${String(scaleX)} ${String(scaleY)})` }
				: null,
			createElement("path", {
				d: PIN_PATH,
				fill: props.fill ?? "#3F3F3A",
				...(props.stroke === undefined ? {} : { stroke: props.stroke }),
			}),
			createElement("circle", { cx: 14, cy: 13, r: 4.5, fill: "#FFFFFF" }),
		);

		return {
			kind: "marker",
			position: toLngLat(props.position),
			size,
			anchor: props.anchor ?? "bottom",
			...(props.padding === undefined ? {} : { padding: props.padding }),
			...(props.reserve === undefined ? {} : { reserve: props.reserve }),
			markup: renderOverlay(glyph, context.warn),
		};
	},
);
