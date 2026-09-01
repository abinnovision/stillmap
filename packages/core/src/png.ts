import { StillmapError } from "./errors.js";
import { assertFontsExist } from "./fonts.js";

import type { FontFace } from "./fonts.js";
/*
 * Type-only import of an optional peer. Erased at build time, so it never
 * becomes a runtime require and core stays installable without resvg.
 */
import type { Resvg as ResvgClass } from "@resvg/resvg-js";

export interface ToPngArgs {
	readonly svg: string;
	/** Intrinsic width in CSS pixels, from the render result. */
	readonly width: number;
	readonly scale?: number;
	readonly fonts: readonly FontFace[];
}

/**
 * Rasterises an SVG string. `@resvg/resvg-js` is an optional peer dependency, so
 * it is imported lazily and its absence is reported as an actionable error
 * rather than a module resolution failure.
 */
export async function toPng(args: ToPngArgs): Promise<Buffer> {
	assertFontsExist(args.fonts);

	let Resvg: typeof ResvgClass;

	try {
		({ Resvg } = await import("@resvg/resvg-js"));
	} catch (error) {
		throw new StillmapError(
			"PNG_BACKEND_MISSING",
			"PNG output needs @resvg/resvg-js. Install it: yarn add @resvg/resvg-js",
			{ cause: error instanceof Error ? error.message : String(error) },
		);
	}

	const first = args.fonts[0];

	const renderer = new Resvg(args.svg, {
		fitTo: { mode: "width", value: args.width * (args.scale ?? 1) },
		font: {
			/*
			 * Paths only. resvg's musl build accepts `fontBuffers` and never uses
			 * them, so exposing a buffer API would be a silent failure by design.
			 */
			fontFiles: args.fonts.map((font) => font.file),
			loadSystemFonts: false,
			...(first === undefined
				? {}
				: {
						defaultFontFamily: first.family,
						sansSerifFamily: first.family,
					}),
		},
	});

	return renderer.render().asPng();
}
