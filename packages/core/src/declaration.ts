import type { CanonicalKind } from "./canonical.js";
import type { Color, Filter } from "./filter.js";
import type { CanvasPoint, LngLat } from "./geometry.js";
import type { Zoomable } from "./zoomable.js";

export type Placement =
	"top-left" | "top-right" | "bottom-left" | "bottom-right";

export type MarkerAnchor =
	| "center"
	| "top"
	| "bottom"
	| "left"
	| "right"
	| "top-left"
	| "top-right"
	| "bottom-left"
	| "bottom-right";

/** How a layer addresses its features: through the schema, or by raw name. */
export type LayerTarget =
	| {
			readonly mode: "canonical";
			readonly kind: CanonicalKind;
			readonly classes?: readonly string[];
	  }
	| { readonly mode: "raw"; readonly sourceLayer: string };

export interface LayerDeclaration {
	readonly kind: "fill" | "line";
	readonly target: LayerTarget;
	readonly filter?: Filter;
	readonly minZoom?: number;
	readonly maxZoom?: number;
	readonly fill?: Zoomable<Color>;
	readonly fillOpacity?: Zoomable<number>;
	readonly stroke?: Zoomable<Color>;
	readonly width?: Zoomable<number>;
	readonly dash?: Zoomable<readonly number[]>;
	readonly opacity?: Zoomable<number>;
}

export interface LabelDeclaration {
	readonly kind: "labels";
	readonly classes?: readonly string[];
	readonly minZoom?: number;
	readonly maxZoom?: number;
	readonly color?: Color;
	readonly halo?: Color;
	readonly haloWidth?: number;
	readonly fontFamily?: string;
	readonly fontSize?: Zoomable<number>;
	readonly fontWeight?: number;
	readonly letterSpacing?: number;
	readonly maxCount?: number;
	/** Lower wins a collision. */
	readonly priority?: number;
}

export interface MarkerDeclaration {
	readonly kind: "marker";
	readonly position: LngLat;
	readonly size: readonly [width: number, height: number];
	readonly anchor: MarkerAnchor;
	readonly offset?: readonly [x: number, y: number];
	readonly padding?: number;
	/**
	 * Whether the marker claims its box against label collision. Defaults to
	 * true. Setting it false draws the marker without reserving anything, so
	 * labels place as though it were not there and it may cover them.
	 */
	readonly reserve?: boolean;
	/** Pre-rendered SVG markup for the marker's children. */
	readonly markup: string;
}

export interface AttributionDeclaration {
	readonly kind: "attribution";
	readonly placement?: Placement;
	readonly color?: Color;
	readonly fontSize?: number;
}

export type Declaration =
	| LayerDeclaration
	| LabelDeclaration
	| MarkerDeclaration
	| AttributionDeclaration;

/** Offset from a marker's box origin to the point that lands on the anchor. */
export function anchorOffset(
	anchor: MarkerAnchor,
	size: readonly [number, number],
): { readonly dx: number; readonly dy: number } {
	const [width, height] = size;

	const dx =
		anchor === "left" || anchor === "top-left" || anchor === "bottom-left"
			? 0
			: anchor === "right" ||
				  anchor === "top-right" ||
				  anchor === "bottom-right"
				? width
				: width / 2;

	const dy =
		anchor === "top" || anchor === "top-left" || anchor === "top-right"
			? 0
			: anchor === "bottom" ||
				  anchor === "bottom-left" ||
				  anchor === "bottom-right"
				? height
				: height / 2;

	return { dx, dy };
}

/** Where a marker's box origin sits, given the projected anchor point. */
export function markerOrigin(
	declaration: MarkerDeclaration,
	at: CanvasPoint,
): { readonly x: number; readonly y: number } {
	const { dx, dy } = anchorOffset(declaration.anchor, declaration.size);
	const [ox, oy] = declaration.offset ?? [0, 0];

	return { x: at.x - dx + ox, y: at.y - dy + oy };
}
