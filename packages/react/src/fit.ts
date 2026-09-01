import {
	StillmapError,
	anchorOffset,
	lngLatToWorld,
	world,
	worldToLngLat,
} from "@stillmap/core";

import type { LngLat, MarkerDeclaration } from "@stillmap/core";

export interface FitMarkersArgs {
	readonly markers: readonly MarkerDeclaration[];
	readonly width: number;
	readonly height: number;
	readonly maxZoom: number;
	readonly padding?:
		| number
		| readonly [top: number, right: number, bottom: number, left: number];
	readonly fallbackZoom?: number;
}

export interface FittedViewport {
	readonly center: LngLat;
	readonly zoom: number;
}

const DEFAULT_FALLBACK_ZOOM = 13;
/** Zoom used only as the reference frame for measuring the marker spread. */
const PROBE_ZOOM = 0;

interface Overhang {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

function paddingOf(
	padding: FitMarkersArgs["padding"],
): readonly [number, number, number, number] {
	if (padding === undefined) {
		return [0, 0, 0, 0];
	}

	return typeof padding === "number"
		? [padding, padding, padding, padding]
		: padding;
}

/**
 * Derives a viewport from the declared markers.
 *
 * Marker boxes are in CSS pixels and do not scale with zoom, so their overhang
 * folds into the padding rather than needing an iterative solve.
 */
export function fitMarkers(args: FitMarkersArgs): FittedViewport {
	if (args.markers.length === 0) {
		throw new StillmapError(
			"FIT_WITHOUT_MARKERS",
			'fit="markers" needs at least one marker in the tree.',
		);
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	const overhang: Overhang = { left: 0, right: 0, top: 0, bottom: 0 };

	for (const marker of args.markers) {
		const point = lngLatToWorld(marker.position, PROBE_ZOOM);

		minX = Math.min(minX, point.x);
		minY = Math.min(minY, point.y);
		maxX = Math.max(maxX, point.x);
		maxY = Math.max(maxY, point.y);

		const { dx, dy } = anchorOffset(marker.anchor, marker.size);
		const pad = marker.padding ?? 0;

		overhang.left = Math.max(overhang.left, dx + pad);
		overhang.right = Math.max(overhang.right, marker.size[0] - dx + pad);
		overhang.top = Math.max(overhang.top, dy + pad);
		overhang.bottom = Math.max(overhang.bottom, marker.size[1] - dy + pad);
	}

	const [padTop, padRight, padBottom, padLeft] = paddingOf(args.padding);

	/*
	 * `world()` keeps the midpoint in world space, so the compiler still refuses
	 * to confuse it with a canvas coordinate.
	 */
	const center = worldToLngLat(
		world((minX + maxX) / 2, (minY + maxY) / 2),
		PROBE_ZOOM,
	);

	const spanX = maxX - minX;
	const spanY = maxY - minY;

	if (spanX === 0 && spanY === 0) {
		return { center, zoom: args.fallbackZoom ?? DEFAULT_FALLBACK_ZOOM };
	}

	// Pixels left for the markers themselves, once fixed-size chrome is removed.
	const usableWidth = Math.max(
		1,
		args.width - padLeft - padRight - overhang.left - overhang.right,
	);
	const usableHeight = Math.max(
		1,
		args.height - padTop - padBottom - overhang.top - overhang.bottom,
	);

	const zoomX = spanX === 0 ? Infinity : Math.log2(usableWidth / spanX);
	const zoomY = spanY === 0 ? Infinity : Math.log2(usableHeight / spanY);

	return { center, zoom: Math.min(zoomX, zoomY, args.maxZoom) };
}
