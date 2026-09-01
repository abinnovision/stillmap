import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";

import { StillmapError } from "./errors.js";

import type { WarningCollector } from "./warnings.js";

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

/** A face ready to be written into an SVG `@font-face` rule. */
export interface EmbeddedFont {
	readonly family: string;
	readonly weight?: number;
	readonly style?: "normal" | "italic";
	/** `data:` URI carrying the whole file. */
	readonly source: string;
	readonly format: "opentype" | "truetype";
}

/**
 * Formats a browser accepts inside `@font-face`. Collections are deliberately
 * absent: `.ttc` and `.otc` hold several faces, no browser loads one through
 * `@font-face`, and resvg reads them from the path anyway.
 */
const EMBEDDABLE: Readonly<
	Record<
		string,
		{ readonly mime: string; readonly format: EmbeddedFont["format"] }
	>
> = {
	".otf": { mime: "font/otf", format: "opentype" },
	".ttf": { mime: "font/ttf", format: "truetype" },
};

function embeddableAs(file: string): (typeof EMBEDDABLE)[string] | undefined {
	const extension = file.toLowerCase().slice(file.lastIndexOf("."));

	return EMBEDDABLE[extension];
}

/**
 * Encoded files, one entry per path. Re-encoding a megabyte of font on every
 * render dominated the cost of an embedded SVG, and the stored timestamp means
 * replacing the file still takes effect.
 */
const encoded = new Map<
	string,
	{ readonly mtimeMs: number; readonly uri: string }
>();

async function dataUri(file: string, mime: string): Promise<string> {
	const { mtimeMs } = await stat(file);
	const hit = encoded.get(file);

	if (hit !== undefined && hit.mtimeMs === mtimeMs) {
		return hit.uri;
	}

	const uri = `data:${mime};base64,${(await readFile(file)).toString("base64")}`;

	encoded.set(file, { mtimeMs, uri });

	return uri;
}

/**
 * Reads every declared font into a data URI.
 *
 * The rasteriser never needs this: it opens the file by path. It exists so an
 * SVG can be read somewhere else, where `font-family="Inter"` alone resolves
 * against whatever fonts the viewer happens to have installed.
 */
export async function loadEmbeddableFonts(
	fonts: readonly FontFace[],
	warn: WarningCollector,
): Promise<readonly EmbeddedFont[]> {
	const loaded = await Promise.all(
		fonts.map(async (font): Promise<EmbeddedFont | null> => {
			const kind = embeddableAs(font.file);

			if (kind === undefined) {
				warn.warn(
					"FONT_NOT_EMBEDDABLE",
					`${font.file} cannot be embedded in an SVG. Only .ttf and .otf can; a font collection has to stay a file path.`,
					{ family: font.family, file: font.file },
				);

				return null;
			}

			return {
				family: font.family,
				source: await dataUri(font.file, kind.mime),
				format: kind.format,
				...(font.weight === undefined ? {} : { weight: font.weight }),
				...(font.style === undefined ? {} : { style: font.style }),
			};
		}),
	);

	return loaded.filter((font): font is EmbeddedFont => font !== null);
}
