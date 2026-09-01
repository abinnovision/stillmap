import { resolveRule } from "./style.js";

import type { DecodedFeature } from "./decode.js";
import type { PixelBounds, WorldPoint } from "./geometry.js";
import type { PaintRule } from "./style.js";

/** One merged path covering every feature that resolved to the same rule. */
export interface PathGroup {
	readonly rule: PaintRule;
	readonly d: string;
}

export interface BuildPathsArgs {
	readonly features: readonly DecodedFeature[];
	readonly rules: readonly PaintRule[];
	readonly bounds: PixelBounds;
	readonly width: number;
	readonly height: number;
}

/** Geometry this far outside the canvas cannot affect a visible stroke. */
const CLIP_MARGIN = 64;

function formatCoordinate(value: number): string {
	return String(Math.round(value * 10) / 10);
}

interface ViewportTest {
	readonly bounds: PixelBounds;
	readonly width: number;
	readonly height: number;
}

function intersectsViewport(
	ring: readonly WorldPoint[],
	viewport: ViewportTest,
): boolean {
	const { bounds, width, height } = viewport;
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const point of ring) {
		const x = point.x - bounds.minX;
		const y = point.y - bounds.minY;

		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x);
		maxY = Math.max(maxY, y);
	}

	return (
		maxX >= -CLIP_MARGIN &&
		minX <= width + CLIP_MARGIN &&
		maxY >= -CLIP_MARGIN &&
		minY <= height + CLIP_MARGIN
	);
}

/**
 * Serialises one ring, skipping points that round to the same position as their
 * predecessor. Returns an empty string for geometry that collapses to a point.
 */
function ringToPath(
	ring: readonly WorldPoint[],
	bounds: PixelBounds,
	close: boolean,
): string {
	if (ring.length < 2) {
		return "";
	}

	const parts: string[] = [];
	let previousX: string | null = null;
	let previousY: string | null = null;

	for (const point of ring) {
		const x = formatCoordinate(point.x - bounds.minX);
		const y = formatCoordinate(point.y - bounds.minY);

		if (x === previousX && y === previousY) {
			continue;
		}

		parts.push(`${parts.length === 0 ? "M" : "L"}${x} ${y}`);
		previousX = x;
		previousY = y;
	}

	if (parts.length < 2) {
		return "";
	}

	return close ? `${parts.join("")}Z` : parts.join("");
}

/**
 * Merges every feature sharing a rule into one path string. Element-per-feature
 * was measured 4.5x slower and 1.3x larger on 4000 features, which is why
 * feature geometry never becomes an element.
 */
export function buildPaths(args: BuildPathsArgs): readonly PathGroup[] {
	const byRule = new Map<PaintRule, string[]>();

	for (const feature of args.features) {
		const rule = resolveRule(feature, args.rules);

		if (rule === null) {
			continue;
		}

		// Polygons close; points and line strings do not.
		const close = feature.type === 3;

		for (const ring of feature.geometry) {
			if (
				!intersectsViewport(ring, {
					bounds: args.bounds,
					width: args.width,
					height: args.height,
				})
			) {
				continue;
			}

			const path = ringToPath(ring, args.bounds, close);

			if (path === "") {
				continue;
			}

			const existing = byRule.get(rule);

			if (existing === undefined) {
				byRule.set(rule, [path]);
			} else {
				existing.push(path);
			}
		}
	}

	return [...byRule.entries()]
		.map(([rule, paths]) => ({ rule, d: paths.join("") }))
		.sort((a, b) => a.rule.order - b.rule.order);
}
