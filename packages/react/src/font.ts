import { defineComponent } from "./registry.js";

import type { FontFace } from "@stillmap/core";

export interface FontProps {
	readonly family: string;
	readonly weight?: number;
	readonly style?: "normal" | "italic";
	/**
	 * Absolute path to the font file. There is no buffer form: resvg's musl
	 * build accepts buffers and silently ignores them.
	 */
	readonly file: string;
}

/**
 * Declares a font face for label and marker text. Every declared path is
 * checked before the first tile is fetched, so a wrong path fails immediately
 * instead of producing a map with no labels.
 */
export const Font = defineComponent<FontProps>(
	"Font",
	"font",
	(props): FontFace => ({
		family: props.family,
		file: props.file,
		...(props.weight === undefined ? {} : { weight: props.weight }),
		...(props.style === undefined ? {} : { style: props.style }),
	}),
);
