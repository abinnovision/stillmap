import type { Placement } from "./declaration.js";
import type { Color } from "./filter.js";
import type { EmbeddedFont } from "./fonts.js";
import type { PlacedLabel } from "./labels.js";
import type { PathGroup } from "./layout.js";
import type { Attribution } from "./source.js";

/** Pre-rendered markup positioned at a canvas coordinate. */
export interface OverlayMarkup {
	readonly markup: string;
	readonly x: number;
	readonly y: number;
}

export interface Scene {
	readonly width: number;
	readonly height: number;
	/**
	 * Device pixel ratio. Applied to the root dimensions only, so the viewBox
	 * stays in CSS pixels and every authored stroke width keeps its meaning.
	 */
	readonly scale: number;
	readonly background: Color;
	readonly paths: readonly PathGroup[];
	readonly labels: readonly PlacedLabel[];
	readonly overlays: readonly OverlayMarkup[];
	readonly attribution: readonly Attribution[];
	readonly attributionPlacement: Placement;
	readonly attributionColor?: Color;
	readonly attributionFontSize?: number;
	/** Written as `@font-face` rules so the SVG carries its own text. */
	readonly embeddedFonts?: readonly EmbeddedFont[];
}

const ATTRIBUTION_FONT_SIZE = 9;
const ATTRIBUTION_LETTER_SPACING = 0.1;
const ATTRIBUTION_COLOR = "#8A8A83";
const ATTRIBUTION_PADDING = 6;

const ESCAPES: Readonly<Record<string, string>> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&apos;",
};

export function escapeXml(value: string): string {
	return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

function num(value: number): string {
	return String(Math.round(value * 10) / 10);
}

function renderPath(group: PathGroup): string {
	if (group.rule.kind === "fill") {
		const opacity =
			group.rule.fillOpacity === 1
				? ""
				: ` fill-opacity="${num(group.rule.fillOpacity)}"`;

		return `<path d="${group.d}" fill="${escapeXml(group.rule.fill)}"${opacity}/>`;
	}

	const dash =
		group.rule.dash === undefined
			? ""
			: ` stroke-dasharray="${group.rule.dash.map(num).join(" ")}"`;
	const opacity =
		group.rule.opacity === 1
			? ""
			: ` stroke-opacity="${num(group.rule.opacity)}"`;

	return (
		`<path d="${group.d}" fill="none" stroke="${escapeXml(group.rule.stroke)}"` +
		` stroke-width="${num(group.rule.width)}" stroke-linecap="round"` +
		` stroke-linejoin="round"${dash}${opacity}/>`
	);
}

function renderLabel(label: PlacedLabel): string {
	/*
	 * `paint-order="stroke"` draws the halo behind the glyph fill, which is the
	 * only way to get a readable halo without emitting the text twice.
	 */
	const halo =
		label.halo === undefined
			? ""
			: ` stroke="${escapeXml(label.halo)}" stroke-width="${num(label.haloWidth)}"` +
				` stroke-linejoin="round" paint-order="stroke"`;

	return (
		`<text x="${num(label.anchor.x)}" y="${num(label.anchor.y)}"` +
		` text-anchor="middle" dominant-baseline="central"` +
		` font-family="${escapeXml(label.fontFamily)}"` +
		` font-size="${num(label.fontSize)}" font-weight="${String(label.fontWeight)}"` +
		` letter-spacing="${num(label.letterSpacing)}"` +
		` fill="${escapeXml(label.color)}"${halo}>${escapeXml(label.text)}</text>`
	);
}

function renderFontFace(font: EmbeddedFont): string {
	return (
		`@font-face{font-family:"${escapeXml(font.family)}";` +
		(font.weight === undefined ? "" : `font-weight:${String(font.weight)};`) +
		(font.style === undefined ? "" : `font-style:${font.style};`) +
		`src:url(${font.source}) format("${font.format}");}`
	);
}

function renderFontFaces(scene: Scene): string {
	const fonts = scene.embeddedFonts ?? [];

	if (fonts.length === 0) {
		return "";
	}

	return `<defs><style type="text/css">${fonts.map(renderFontFace).join("")}</style></defs>`;
}

function renderAttribution(scene: Scene): string {
	const text = scene.attribution.map((entry) => entry.text).join(" ");

	if (text === "") {
		return "";
	}

	const size = scene.attributionFontSize ?? ATTRIBUTION_FONT_SIZE;
	const right = scene.attributionPlacement.endsWith("right");
	const bottom = scene.attributionPlacement.startsWith("bottom");

	const x = right ? scene.width - ATTRIBUTION_PADDING : ATTRIBUTION_PADDING;
	const y = bottom
		? scene.height - ATTRIBUTION_PADDING
		: ATTRIBUTION_PADDING + size;

	return (
		`<text x="${num(x)}" y="${num(y)}" text-anchor="${right ? "end" : "start"}"` +
		` font-size="${num(size)}"` +
		` letter-spacing="${String(ATTRIBUTION_LETTER_SPACING)}"` +
		` fill="${escapeXml(scene.attributionColor ?? ATTRIBUTION_COLOR)}">` +
		`${escapeXml(text)}</text>`
	);
}

/**
 * Serialises the scene in three passes: geometry, then labels, then overlays.
 * Attribution is always emitted; there is no path through this function that
 * omits it.
 */
export function serializeScene(scene: Scene): string {
	const parts: string[] = [];

	parts.push(
		`<svg xmlns="http://www.w3.org/2000/svg"` +
			` width="${num(scene.width * scene.scale)}"` +
			` height="${num(scene.height * scene.scale)}"` +
			` viewBox="0 0 ${num(scene.width)} ${num(scene.height)}">`,
	);
	parts.push(renderFontFaces(scene));
	parts.push(
		`<rect width="${num(scene.width)}" height="${num(scene.height)}" fill="${escapeXml(scene.background)}"/>`,
	);

	for (const group of scene.paths) {
		parts.push(renderPath(group));
	}

	for (const label of scene.labels) {
		parts.push(renderLabel(label));
	}

	for (const overlay of scene.overlays) {
		parts.push(
			`<g transform="translate(${num(overlay.x)} ${num(overlay.y)})">${overlay.markup}</g>`,
		);
	}

	parts.push(renderAttribution(scene));
	parts.push("</svg>");

	return parts.join("");
}
