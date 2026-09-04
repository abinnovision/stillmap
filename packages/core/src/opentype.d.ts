/**
 * opentype.js 2.0 ships no type declarations. This declares the sliver the
 * metrics module uses, nothing more, so the ambient surface stays deterministic.
 *
 * `parse` is declared as a named export because the package's ESM build has no
 * default export; importing the default resolves only under Node's CommonJS
 * interop and breaks under any bundler that prefers the `module` entry.
 */
declare module "opentype.js" {
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
