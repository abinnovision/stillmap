/**
 * opentype.js 2.0 ships no type declarations. This declares the sliver the
 * metrics module uses, nothing more, so the ambient surface stays deterministic.
 *
 * The ESM build is named directly because the package entry cannot be imported
 * the same way twice: it points `main` at a UMD file, whose IIFE wrapper hides
 * the named exports from Node's CommonJS detection, and `module` at this file,
 * which has the named exports and no default. Naming the file gives every
 * resolver the same module.
 */
declare module "opentype.js/dist/opentype.mjs" {
	interface OpentypeGlyph {
		readonly advanceWidth?: number;
		readonly unicode?: number;
	}

	interface OpentypeFont {
		readonly unitsPerEm: number;
		readonly ascender: number;
		readonly descender: number;
		charToGlyph: (char: string) => OpentypeGlyph;
		getKerningValue: (left: OpentypeGlyph, right: OpentypeGlyph) => number;
	}

	export function parse(buffer: ArrayBuffer): OpentypeFont;

	export type { OpentypeFont };
}
