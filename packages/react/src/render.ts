import {
	StillmapError,
	createWarningCollector,
	renderScene,
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
	/** Promote every warning to a throw. Intended for CI and golden tests. */
	readonly strict?: boolean;
}

export interface RenderedSvg {
	readonly svg: string;
	/** CSS pixels, before `scale` is applied to the SVG root. */
	readonly width: number;
	readonly height: number;
	readonly warnings: readonly RenderWarning[];
}

export interface RenderedPng extends RenderedSvg {
	readonly png: Buffer;
}

const DEFAULT_FIT_MAX_ZOOM = 17;

interface Viewport {
	readonly center: LngLat | MapProps["center"];
	readonly zoom: number;
}

function resolveViewport(props: MapProps, walked: WalkResult): Viewport {
	if (props.fit !== "markers") {
		return { center: props.center, zoom: props.zoom };
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
		center: view.center as LngLat,
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
