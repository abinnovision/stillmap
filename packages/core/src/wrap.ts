import type { TextMeasurer, TextStyle } from "./metrics.js";

/**
 * A break may fall after any of these. A space is consumed by the break; a
 * hyphen, slash, or dash stays on the line it ends.
 */
const BREAK_AFTER = new Set([" ", "-", "/", "‐", "–"]);

interface Atom {
	readonly text: string;
	readonly width: number;
	/** Width the atom loses when a break lands right after it. */
	readonly trim: number;
}

function atomize(
	text: string,
	style: TextStyle,
	measure: TextMeasurer,
): Atom[] {
	const atoms: Atom[] = [];
	let start = 0;

	for (let i = 0; i < text.length; i++) {
		if (BREAK_AFTER.has(text[i] as string)) {
			const piece = text.slice(start, i + 1);

			atoms.push({
				text: piece,
				width: measure(piece, style).width,
				trim: piece.endsWith(" ")
					? measure(piece, style).width - measure(piece.trimEnd(), style).width
					: 0,
			});
			start = i + 1;
		}
	}

	if (start < text.length) {
		const piece = text.slice(start);

		atoms.push({ text: piece, width: measure(piece, style).width, trim: 0 });
	}

	return atoms;
}

/**
 * Cost of a line, after MapLibre's shaping: squared distance from the target,
 * with a short last line half as bad and a long one twice as bad, so ragged
 * ends trail off rather than overhang.
 */
function badness(width: number, target: number, isLast: boolean): number {
	const raggedness = (width - target) ** 2;

	if (!isLast) {
		return raggedness;
	}

	return width < target ? raggedness / 2 : raggedness * 2;
}

/**
 * Breaks a label into visually balanced lines no wider than `maxWidth`
 * (best effort: a single unbreakable word may exceed it).
 *
 * The target line width is `total / lineCount`, not `maxWidth`: a 12em name
 * against a 10em limit becomes two lines of about 6em each rather than 10 + 2.
 * Line assignment is the optimal-breaks dynamic program over the candidate
 * break points, which for a label's handful of words costs nothing.
 */
export interface WrapArgs {
	readonly style: TextStyle;
	readonly measure: TextMeasurer;
	/** Widest a line may run, in canvas pixels. */
	readonly maxWidth: number;
}

export function wrapText(text: string, args: WrapArgs): readonly string[] {
	const { style, measure, maxWidth } = args;
	const total = measure(text, style).width;

	if (total <= maxWidth) {
		return [text];
	}

	const atoms = atomize(text, style, measure);

	if (atoms.length <= 1) {
		return [text];
	}

	const lineCount = Math.max(1, Math.ceil(total / maxWidth));
	const target = total / lineCount;

	/*
	 * best[i] is the least badness of breaking the first i atoms into lines,
	 * with prior[i] the start of the last of those lines.
	 */
	const best: number[] = [0];
	const prior: number[] = [0];

	for (let end = 1; end <= atoms.length; end++) {
		const isLast = end === atoms.length;
		let bestCost = Infinity;
		let bestStart = 0;

		for (let start = 0; start < end; start++) {
			let width = 0;

			for (let i = start; i < end; i++) {
				width += (atoms[i] as Atom).width;
			}

			width -= (atoms[end - 1] as Atom).trim;

			const cost = (best[start] as number) + badness(width, target, isLast);

			if (cost <= bestCost) {
				bestCost = cost;
				bestStart = start;
			}
		}

		best.push(bestCost);
		prior.push(bestStart);
	}

	const breaks: number[] = [];

	for (let at = atoms.length; at > 0; at = prior[at] as number) {
		breaks.unshift(at);
	}

	const lines: string[] = [];
	let start = 0;

	for (const end of breaks) {
		lines.push(
			atoms
				.slice(start, end)
				.map((atom) => atom.text)
				.join("")
				.trimEnd(),
		);
		start = end;
	}

	return lines;
}
