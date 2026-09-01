import { existsSync } from "node:fs";

import { StillmapError } from "./errors.js";

export interface FontFace {
	readonly family: string;
	readonly weight?: number;
	readonly style?: "normal" | "italic";
	/**
	 * Absolute path to the font file. There is no buffer form: resvg's musl
	 * build accepts `fontBuffers` and never uses them.
	 */
	readonly file: string;
}

/**
 * Formats the rasteriser can actually draw with.
 *
 * A `.woff` or `.woff2` file is accepted by resvg without complaint and then
 * renders nothing at all, which is the same silent failure as an unreadable
 * path. Web font formats are for browsers; this runs in Node.
 */
const SUPPORTED_EXTENSIONS = [".ttf", ".otf", ".ttc", ".otc"];

/**
 * resvg ignores an unreadable font path without erroring, producing a map with
 * no labels. Every path is checked before the first tile is fetched so the
 * failure arrives in milliseconds and names the file.
 */
export function assertFontsExist(fonts: readonly FontFace[]): void {
	for (const font of fonts) {
		/*
		 * Format first: it is a property of the declaration, so it can be
		 * rejected without touching the filesystem and gives the better message.
		 */
		const lower = font.file.toLowerCase();

		if (!SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
			throw new StillmapError(
				"FONT_FORMAT_UNSUPPORTED",
				`Unsupported font format: ${font.file}. Use one of ${SUPPORTED_EXTENSIONS.join(", ")}. A web font such as .woff2 loads without error and then renders no text at all.`,
				{ family: font.family, file: font.file },
			);
		}

		if (!existsSync(font.file)) {
			throw new StillmapError(
				"FONT_NOT_FOUND",
				`Font file not found: ${font.file}`,
				{ family: font.family, file: font.file },
			);
		}
	}
}

/** Declaring a label with no font that covers it is an error, not a warning. */
export function assertFontCoversLabels(
	fonts: readonly FontFace[],
	requiredFamilies: readonly string[],
): void {
	if (requiredFamilies.length === 0) {
		return;
	}

	const available = new Set(fonts.map((font) => font.family));
	const missing = requiredFamilies.filter((family) => !available.has(family));

	if (missing.length > 0) {
		throw new StillmapError(
			"FONT_MISSING_FOR_LABELS",
			`No font declared for ${missing
				.map((f) => `"${f}"`)
				.join(", ")}. Labels would render blank.`,
			{ missing },
		);
	}
}
