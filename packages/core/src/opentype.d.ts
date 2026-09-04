/**
 * opentype.js 2.0 ships no type declarations. This declares the sliver the
 * metrics module uses, nothing more, so the ambient surface stays deterministic.
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

	function parse(buffer: ArrayBuffer): OpentypeFont;

	const opentype: {
		parse: typeof parse;
	};

	export default opentype;
	export type { OpentypeFont };
}
