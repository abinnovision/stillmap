import {
	StillmapError,
	createWarningCollector,
	renderScene,
	toLngLat,
	toPng,
} from "@stillmap/core";

import { fitMarkers } from "./fit.js";
import { walk } from "./walk.js";

import type { MapProps } from "./map.js";
import type { WalkResult } from "./walk.js";
import type { LngLat, RenderWarning } from "@stillmap/core";
import type { ReactElement } from "react";

export interface RenderOptions {
	readonly format?: "svg" | "png";
	readonly scale?: number;
	readonly signal?: AbortSignal;
	readonly onWarning?: (warning: RenderWarning) => void;
	/**
	 * Write the declared fonts into the SVG as `@font-face` data URIs, so it
	 * renders correctly somewhere that does not have them installed. Costs the
	 * size of the font files; the PNG path never needs it.
	 */
	readonly embedFonts?: boolean;
	/** Promote every warning to a throw. Intended for CI and golden tests. */
	readonly strict?: boolean;
}

export interface RenderedSvg {
	readonly svg: string;
	/** CSS pixels, before `scale` is applied to the SVG root. */
	readonly width: number;
	readonly height: number;
	/**
	 * The view actually drawn. Under `fit="markers"` these are derived from the
	 * tree rather than declared, and are otherwise unobservable.
	 */
	readonly viewport: ResolvedViewport;
	readonly warnings: readonly RenderWarning[];
}

export interface RenderedPng extends RenderedSvg {
	readonly png: Buffer;
}

/** A view resolved to concrete coordinates, however it was declared. */
export interface ResolvedViewport {
	readonly center: LngLat;
	readonly zoom: number;
}

const DEFAULT_FIT_MAX_ZOOM = 17;

function resolveViewport(
	props: MapProps,
	walked: WalkResult,
): ResolvedViewport {
	if (props.fit !== "markers") {
		return { center: toLngLat(props.center), zoom: props.zoom };
	}

	return fitMarkers({
		markers: walked.markers,
		width: props.width,
		height: props.height,
		maxZoom: props.maxZoom ?? DEFAULT_FIT_MAX_ZOOM,
		...(props.padding === undefined ? {} : { padding: props.padding }),
		...(props.fallbackZoom === undefined
			? {}
			: { fallbackZoom: props.fallbackZoom }),
	});
}

export function renderMap(
	element: ReactElement,
	options: RenderOptions & { readonly format: "png" },
): Promise<RenderedPng>;
export function renderMap(
	element: ReactElement,
	options?: RenderOptions & { readonly format?: "svg" },
): Promise<RenderedSvg>;
export async function renderMap(
	element: ReactElement,
	options: RenderOptions = {},
): Promise<RenderedSvg | RenderedPng> {
	const warn = createWarningCollector({
		...(options.onWarning === undefined
			? {}
			: { onWarning: options.onWarning }),
		...(options.strict === undefined ? {} : { strict: options.strict }),
	});

	const walked = walk(element, warn);

	if (walked.map === null) {
		throw new StillmapError(
			"ROOT_ELEMENT_NOT_MAP",
			"The tree contains no <Map>. renderMap needs one, directly or through a component that returns one.",
		);
	}

	const props = walked.map as unknown as MapProps;
	const view = resolveViewport(props, walked);

	const scene = await renderScene({
		source: props.source,
		center: view.center,
		zoom: view.zoom,
		width: props.width,
		height: props.height,
		declarations: walked.layers,
		labelDeclarations: walked.labels,
		markers: walked.markers,
		fonts: walked.fonts,
		...(props.background === undefined ? {} : { background: props.background }),
		...(props.locale === undefined ? {} : { locale: props.locale }),
		...(options.scale === undefined ? {} : { scale: options.scale }),
		...(options.embedFonts === undefined
			? {}
			: { embedFonts: options.embedFonts }),
		...(walked.attribution?.placement === undefined
			? {}
			: { attributionPlacement: walked.attribution.placement }),
		...(options.signal === undefined ? {} : { signal: options.signal }),
		/*
		 * renderScene keeps its own collector; forwarding here means each warning
		 * lands in the returned array exactly once, and strict mode still throws.
		 */
		onWarning: (warning) => {
			warn.warn(warning.code, warning.message, warning.detail);
		},
	});

	const result: RenderedSvg = {
		svg: scene.svg,
		width: scene.width,
		height: scene.height,
		viewport: view,
		warnings: warn.warnings,
	};

	if (options.format !== "png") {
		return result;
	}

	return {
		...result,
		png: await toPng({
			svg: scene.svg,
			width: scene.width,
			fonts: walked.fonts,
			...(options.scale === undefined ? {} : { scale: options.scale }),
		}),
	};
}
