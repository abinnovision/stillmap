import { readFile, stat } from "node:fs/promises";
import { parse } from "opentype.js/dist/opentype.mjs";

import type { FontFace } from "./fonts.js";
import type { WarningCollector } from "./warnings.js";
import type { OpentypeFont } from "opentype.js/dist/opentype.mjs";

export interface TextStyle {
	readonly fontFamily: string;
	readonly fontWeight: number;
	readonly fontSize: number;
	readonly letterSpacing: number;
}

export interface MeasuredText {
	/** Advance width of the whole run, kerned. */
	readonly width: number;
	/** Distance from the baseline to the top of the em box. */
	readonly ascent: number;
	/** Distance from the baseline to the bottom of the em box, positive. */
	readonly descent: number;
}

export type TextMeasurer = (text: string, style: TextStyle) => MeasuredText;

/**
 * Mean glyph advance as a fraction of the em, measured across the Latin
 * subset. The fallback for text no declared font covers, and for fonts the
 * parser cannot read; a real font beats it every time.
 */
const MEAN_ADVANCE_EM = 0.55;

export function estimateTextWidth(
	text: string,
	fontSize: number,
	letterSpacing: number,
): number {
	return text.length * (fontSize * MEAN_ADVANCE_EM + letterSpacing);
}

/**
 * The fallback measurer: one em of height, split at the midline the renderer
 * centres on.
 */
export const estimateMeasurer: TextMeasurer = (text, style) => ({
	width: estimateTextWidth(text, style.fontSize, style.letterSpacing),
	ascent: style.fontSize / 2,
	descent: style.fontSize / 2,
});

interface LoadedFace {
	readonly weight: number;
	readonly font: OpentypeFont;
}

/**
 * Parsed files, one entry per path. Parsing a font costs milliseconds and the
 * same file serves every render; the stored timestamp means replacing the file
 * still takes effect.
 */
const parsed = new Map<
	string,
	{ readonly mtimeMs: number; readonly font: OpentypeFont | null }
>();

async function parseFont(file: string): Promise<OpentypeFont | null> {
	const { mtimeMs } = await stat(file);
	const hit = parsed.get(file);

	if (hit !== undefined && hit.mtimeMs === mtimeMs) {
		return hit.font;
	}

	let font: OpentypeFont | null = null;

	try {
		const buffer = await readFile(file);

		font = parse(
			buffer.buffer.slice(
				buffer.byteOffset,
				buffer.byteOffset + buffer.byteLength,
			),
		);
	} catch {
		// Collections and malformed files fall back to the estimate.
	}

	parsed.set(file, { mtimeMs, font });

	return font;
}

/**
 * Reads every declared font once and returns a measurer backed by real
 * advance widths. A file the parser cannot read (a `.ttc` collection, say)
 * degrades to the estimate with a warning rather than failing the render:
 * the numbers place boxes, resvg still draws the text.
 */
export async function loadTextMeasurer(
	fonts: readonly FontFace[],
	warn: WarningCollector,
): Promise<TextMeasurer> {
	const families = new Map<string, LoadedFace[]>();

	for (const face of fonts) {
		const font = await parseFont(face.file);

		if (font === null) {
			warn.warn(
				"FONT_METRICS_UNAVAILABLE",
				`${face.file} could not be parsed for metrics. Labels in "${face.family}" are measured by estimate and may sit slightly tighter or looser than they draw.`,
				{ family: face.family, file: face.file },
			);
			continue;
		}

		const faces = families.get(face.family) ?? [];

		faces.push({ weight: face.weight ?? 400, font });
		families.set(face.family, faces);
	}

	return (text, style) => {
		const faces = families.get(style.fontFamily);

		if (faces === undefined) {
			return estimateMeasurer(text, style);
		}

		let best = faces[0] as LoadedFace;

		for (const face of faces) {
			if (
				Math.abs(face.weight - style.fontWeight) <
				Math.abs(best.weight - style.fontWeight)
			) {
				best = face;
			}
		}

		const { font } = best;
		const scale = style.fontSize / font.unitsPerEm;

		/*
		 * Advances are accumulated glyph by glyph rather than through the
		 * library's text API, which walks the substitution tables and throws
		 * on GSUB lookups it does not implement. Real fonts, Inter included,
		 * carry such lookups; kerning pairs are all the layout this needs.
		 */
		let units = 0;
		let glyphs = 0;
		let previous = null as ReturnType<typeof font.charToGlyph> | null;

		for (const char of text) {
			const glyph = font.charToGlyph(char);

			if (previous !== null) {
				units += font.getKerningValue(previous, glyph);
			}

			units += glyph.advanceWidth ?? 0;
			glyphs += 1;
			previous = glyph;
		}

		return {
			width: units * scale + Math.max(0, glyphs - 1) * style.letterSpacing,
			ascent: font.ascender * scale,
			descent: Math.abs(font.descender) * scale,
		};
	};
}
