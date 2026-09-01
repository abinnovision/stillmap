import { renderMap } from "@stillmap/react";

import { loadTemplate } from "./load.js";

import type { LngLat, RenderWarning } from "@stillmap/core";
import type { RenderedSvg } from "@stillmap/react";
import type { ReactElement } from "react";

export type Format = "png" | "svg";

export type RenderOutput =
	| { readonly kind: "svg"; readonly svg: string }
	| { readonly kind: "png"; readonly image: string };

export interface RenderOk {
	readonly kind: "ok";
	readonly output: RenderOutput;
	readonly width: number;
	readonly height: number;
	/** Resolved, so `fit="markers"` stops being invisible. */
	readonly viewport: { readonly center: LngLat; readonly zoom: number };
	readonly warnings: readonly RenderWarning[];
	readonly durationMs: number;
	/** Set when the requested format could not be produced. */
	readonly note?: string;
}

export interface RenderFailure {
	readonly kind: "error";
	readonly code: string;
	readonly message: string;
	readonly hint?: string;
	readonly stack?: string;
}

export type RenderResponse = RenderOk | RenderFailure;

/** Raster at 2x so the preview is not softer than the output it stands for. */
const PREVIEW_SCALE = 2;

const NO_BACKEND =
	"PNG needs @resvg/resvg-js, which is not installed. Showing SVG, where the" +
	" browser picks the fonts rather than the renderer, so text may not look" +
	" like the output.";

const NO_FONT =
	"This template declares no font, so the PNG would drop every glyph," +
	" including the attribution. Showing SVG, where the browser supplies the" +
	" fonts.";

/** Latched after the first failure: the backend cannot appear mid-session. */
let pngUnavailable = false;

function codeOf(error: Error): string {
	return "code" in error && typeof error.code === "string"
		? error.code
		: "RENDER_FAILED";
}

function hintOf(error: Error): string | undefined {
	return "hint" in error && typeof error.hint === "string"
		? error.hint
		: undefined;
}

function toFailure(error: unknown): RenderFailure {
	if (!(error instanceof Error)) {
		return {
			kind: "error",
			code: "RENDER_FAILED",
			message: "The template threw a value that is not an Error.",
		};
	}

	const hint = hintOf(error);

	return {
		kind: "error",
		code: codeOf(error),
		message: error.message,
		...(hint === undefined ? {} : { hint }),
		...(error.stack === undefined ? {} : { stack: error.stack }),
	};
}

interface OkArgs {
	readonly rendered: RenderedSvg;
	readonly output: RenderOutput;
	readonly started: number;
	readonly note?: string;
}

function toOk({ rendered, output, started, note }: OkArgs): RenderOk {
	return {
		kind: "ok",
		output,
		width: rendered.width,
		height: rendered.height,
		viewport: rendered.viewport,
		warnings: rendered.warnings,
		durationMs: Math.round(performance.now() - started),
		...(note === undefined ? {} : { note }),
	};
}

async function renderSvg(
	element: ReactElement,
	started: number,
	note?: string,
): Promise<RenderOk> {
	/*
	 * Embedded because this SVG is going straight into a browser, which would
	 * otherwise resolve `font-family` against its own fonts and show type the
	 * renderer will never produce. The PNG path has no use for it.
	 */
	const rendered = await renderMap(element, { embedFonts: true });

	return toOk({
		rendered,
		output: { kind: "svg", svg: rendered.svg },
		started,
		...(note === undefined ? {} : { note }),
	});
}

async function renderPng(
	element: ReactElement,
	started: number,
): Promise<RenderOk> {
	try {
		const rendered = await renderMap(element, {
			format: "png",
			scale: PREVIEW_SCALE,
		});

		return toOk({
			rendered,
			output: {
				kind: "png",
				image: `data:image/png;base64,${rendered.png.toString("base64")}`,
			},
			started,
		});
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}

		const code = codeOf(error);

		if (code === "PNG_BACKEND_MISSING") {
			pngUnavailable = true;

			return await renderSvg(element, started, NO_BACKEND);
		}

		/*
		 * A property of the template rather than the session, so this never
		 * latches: the next template may well declare a font.
		 */
		if (code === "FONT_MISSING_FOR_TEXT") {
			return await renderSvg(element, started, NO_FONT);
		}

		throw error;
	}
}

/**
 * Loads and renders one template. Never throws: a broken template has to show
 * up in the browser rather than take the server down.
 *
 * PNG is the default because it is what the renderer actually produces. The
 * SVG carries a bare `font-family` with no embedded font, so a browser resolves
 * it against its own fonts and will happily show text that resvg cannot draw.
 */
export async function renderTemplate(
	file: string,
	cache: string,
	format: Format,
): Promise<RenderResponse> {
	const started = performance.now();

	try {
		const element = await loadTemplate(file, cache);

		return format === "png" && !pngUnavailable
			? await renderPng(element, started)
			: await renderSvg(
					element,
					started,
					format === "png" ? NO_BACKEND : undefined,
				);
	} catch (error) {
		return toFailure(error);
	}
}
