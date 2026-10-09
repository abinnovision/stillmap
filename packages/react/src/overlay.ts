import { renderOverlay } from "./marker-markup.js";
import { defineComponent } from "./registry.js";

import type { OverlayDeclaration, Placement } from "@stillmap/core";
import type { ReactNode } from "react";

export interface OverlayProps {
	/** Image corner the box is pinned to. */
	readonly placement: Placement;
	/** CSS pixels. Required: there is no layout engine to measure children. */
	readonly size: readonly [width: number, height: number];
	/** Distance from the pinned edges. A scalar applies to both axes. */
	readonly inset?: number | readonly [x: number, y: number];
	/**
	 * Whether the overlay claims its box against label collision. Defaults to
	 * true: labels relocate nearby rather than being covered.
	 */
	readonly reserve?: boolean;
	readonly children: ReactNode;
}

/**
 * A box pinned to an image corner, independent of the viewport. An overlay in
 * the attribution's corner is moved inward to clear the attribution text.
 */
export const Overlay = defineComponent<OverlayProps>(
	"Overlay",
	"overlay",
	(props, context): OverlayDeclaration => ({
		kind: "overlay",
		placement: props.placement,
		size: props.size,
		...(props.inset === undefined ? {} : { inset: props.inset }),
		...(props.reserve === undefined ? {} : { reserve: props.reserve }),
		markup: renderOverlay(props.children, context.warn),
	}),
);
