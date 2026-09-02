import { markerOrigin } from "./declaration.js";
import { decodeTile } from "./decode.js";
import {
	assertFontCoversLabels,
	assertFontsExist,
	loadEmbeddableFonts,
} from "./fonts.js";
import { placeLabels } from "./labels.js";
import { buildPaths } from "./layout.js";
import { computePixelBounds, lngLatToWorld, toCanvas } from "./mercator.js";
import { resolveStyle } from "./style.js";
import { serializeScene } from "./svg.js";
import { computeTileCover, tileKey } from "./tile-cover.js";
import { createTileCache, fetchTiles } from "./tiles.js";
import { createWarningCollector } from "./warnings.js";
import { resolveZoomable } from "./zoomable.js";

import type {
	LabelDeclaration,
	LayerDeclaration,
	MarkerDeclaration,
	Placement,
} from "./declaration.js";
import type { DecodedFeature } from "./decode.js";
import type { Color } from "./filter.js";
import type { FontFace } from "./fonts.js";
import type { LngLatLike, PixelBounds } from "./geometry.js";
import type { Box, LabelCandidate } from "./labels.js";
import type { TileSource } from "./source.js";
import type { OverlayMarkup } from "./svg.js";
import type { TileCache } from "./tiles.js";
import type { RenderWarning, WarningCollector } from "./warnings.js";

/** Process-level cache shared by every render that does not supply its own. */
const sharedCache = createTileCache();

const DEFAULT_LABEL_FONT_SIZE = 12;
const DEFAULT_LABEL_COLOR = "#6E6E68";
const DEFAULT_HALO_WIDTH = 3;
const DEFAULT_BACKGROUND = "#FFFFFF";

/**
 * Canvas area, in square pixels, that the default budget allows per label.
 *
 * A flat count cannot be a sensible default: the same number is too tight on a
 * poster and too loose on a banner. Sized so a 1200x300 banner keeps the flat
 * budget of 12 this replaced. Collision alone settles far denser than this on
 * live tiles, down to about 8000 square pixels per label over a city centre,
 * which is well past readable, so the ceiling is meant to bind there.
 */
const AREA_PER_LABEL = 30_000;

/**
 * Default placement budget for one label element.
 *
 * Deliberately a ceiling rather than a density control. Splitting one canvas
 * budget evenly across elements was measured to undershoot by roughly four
 * times, because place classes are not evenly populated: a `city` element with
 * one feature in view leaves its share unspent while an abundant `suburb`
 * element is throttled. Density is `maxRank`'s job; this only stops a
 * pathological tile from emitting hundreds of labels.
 */
function defaultMaxLabels(width: number, height: number): number {
	return Math.max(1, Math.ceil((width * height) / AREA_PER_LABEL));
}

export interface RenderSceneArgs {
	readonly source: TileSource;
	readonly center: LngLatLike;
	readonly zoom: number;
	readonly width: number;
	readonly height: number;
	readonly declarations: readonly LayerDeclaration[];
	readonly labelDeclarations: readonly LabelDeclaration[];
	readonly markers: readonly MarkerDeclaration[];
	readonly fonts: readonly FontFace[];
	/**
	 * Write every declared font into the SVG as an `@font-face` data URI.
	 *
	 * Off by default: it costs the whole file, and the rasteriser opens fonts by
	 * path and ignores the rules. Turn it on when the SVG itself has to travel,
	 * because `font-family` alone resolves against whatever the viewer has.
	 */
	readonly embedFonts?: boolean;
	readonly background?: Color;
	readonly locale?: string;
	readonly scale?: number;
	readonly attributionPlacement?: Placement;
	readonly signal?: AbortSignal;
	readonly cache?: TileCache;
	readonly onWarning?: (warning: RenderWarning) => void;
	readonly strict?: boolean;
}

export interface RenderedScene {
	readonly svg: string;
	/** CSS pixels, before `scale` is applied to the SVG root. */
	readonly width: number;
	readonly height: number;
	readonly warnings: readonly RenderWarning[];
}

interface LabelContext {
	readonly args: RenderSceneArgs;
	readonly features: readonly DecodedFeature[];
	readonly zoom: number;
	readonly bounds: PixelBounds;
	readonly labelLayers: readonly string[];
}

interface CandidateArgs {
	readonly feature: DecodedFeature;
	readonly declaration: LabelDeclaration;
	/** Position of the declaration in the style. Scopes its `maxCount`. */
	readonly element: number;
	/** Budget this element gets when it declares no `maxCount` of its own. */
	readonly defaultMaxCount: number;
	readonly context: LabelContext;
	readonly fallbackFamily: string;
}

/** Builds one candidate, or null when the feature carries no usable label. */
function labelCandidateFor(args: CandidateArgs): LabelCandidate | null {
	const {
		feature,
		declaration,
		element,
		defaultMaxCount,
		context,
		fallbackFamily,
	} = args;
	const { args: scene, zoom } = context;

	// Only point geometry carries a place label.
	if (!context.labelLayers.includes(feature.layer) || feature.type !== 1) {
		return null;
	}

	if (
		declaration.classes !== undefined &&
		!declaration.classes.includes(String(feature.properties["class"]))
	) {
		return null;
	}

	const rank = scene.source.schema.resolveRank(feature.properties);

	if (
		declaration.maxRank !== undefined &&
		rank > resolveZoomable(declaration.maxRank, zoom)
	) {
		return null;
	}

	const text = scene.source.schema.resolveName(
		feature.properties,
		scene.locale,
	);
	const point = feature.geometry[0]?.[0];

	if (text === null || point === undefined) {
		return null;
	}

	return {
		text,
		anchor: toCanvas(point, context.bounds),
		priority: declaration.priority ?? 0,
		rank,
		fontSize: resolveZoomable(
			declaration.fontSize ?? DEFAULT_LABEL_FONT_SIZE,
			zoom,
		),
		fontWeight: declaration.fontWeight ?? 500,
		letterSpacing: declaration.letterSpacing ?? 0,
		fontFamily: declaration.fontFamily ?? fallbackFamily,
		color: declaration.color ?? DEFAULT_LABEL_COLOR,
		...(declaration.halo === undefined ? {} : { halo: declaration.halo }),
		haloWidth: declaration.haloWidth ?? DEFAULT_HALO_WIDTH,
		maxCount: resolveZoomable(declaration.maxCount ?? defaultMaxCount, zoom),
		element,
	};
}

function buildLabelCandidates(
	context: LabelContext,
): readonly LabelCandidate[] {
	const { args, zoom } = context;
	const candidates: LabelCandidate[] = [];
	const fallbackFamily = args.fonts[0]?.family ?? "Inter";
	/*
	 * A place feature on a tile boundary is present in both tiles, so the same
	 * label would otherwise be a candidate twice: one placed, one reported as a
	 * collision with itself. Keyed on text and rounded position, so two distinct
	 * places sharing a name both survive.
	 */
	const seen = new Set<string>();

	const defaultMaxCount = defaultMaxLabels(args.width, args.height);

	for (const [element, declaration] of args.labelDeclarations.entries()) {
		if (
			zoom < (declaration.minZoom ?? -Infinity) ||
			zoom > (declaration.maxZoom ?? Infinity)
		) {
			continue;
		}

		for (const feature of context.features) {
			const candidate = labelCandidateFor({
				feature,
				declaration,
				element,
				defaultMaxCount,
				context,
				fallbackFamily,
			});

			if (candidate === null) {
				continue;
			}

			const key = [
				candidate.text,
				Math.round(candidate.anchor.x).toString(),
				Math.round(candidate.anchor.y).toString(),
			].join("|");

			if (seen.has(key)) {
				continue;
			}

			seen.add(key);
			candidates.push(candidate);
		}
	}

	return candidates;
}

interface ProjectedMarkers {
	readonly overlays: readonly OverlayMarkup[];
	readonly reserved: readonly Box[];
}

/**
 * Projects markers, reserving a box only for those that ask. This runs before
 * label placement so a reserving marker's labels route around it.
 */
interface ProjectMarkersArgs {
	readonly markers: readonly MarkerDeclaration[];
	readonly zoom: number;
	readonly bounds: PixelBounds;
	readonly width: number;
	readonly height: number;
	readonly warn: WarningCollector;
}

function projectMarkers(args: ProjectMarkersArgs): ProjectedMarkers {
	const { markers, zoom, bounds, width, height, warn } = args;
	const overlays: OverlayMarkup[] = [];
	const reserved: Box[] = [];

	for (const [index, marker] of markers.entries()) {
		const at = toCanvas(lngLatToWorld(marker.position, zoom), bounds);
		const origin = markerOrigin(marker, at);
		const [boxWidth, boxHeight] = marker.size;
		const pad = marker.padding ?? 0;

		const offCanvas =
			origin.x + boxWidth < 0 ||
			origin.y + boxHeight < 0 ||
			origin.x > width ||
			origin.y > height;

		if (offCanvas) {
			warn.warn(
				"MARKER_OFFSCREEN",
				`Marker ${String(index)} is entirely off canvas.`,
				{ index, position: marker.position },
			);
			continue;
		}

		if (marker.reserve === true) {
			reserved.push({
				minX: origin.x - pad,
				minY: origin.y - pad,
				maxX: origin.x + boxWidth + pad,
				maxY: origin.y + boxHeight + pad,
			});
		}

		overlays.push({ markup: marker.markup, x: origin.x, y: origin.y });
	}

	return { overlays, reserved };
}

export async function renderScene(
	args: RenderSceneArgs,
): Promise<RenderedScene> {
	const warn = createWarningCollector({
		...(args.onWarning === undefined ? {} : { onWarning: args.onWarning }),
		...(args.strict === undefined ? {} : { strict: args.strict }),
	});

	/*
	 * Fonts are validated before any network work, so a bad path fails in
	 * milliseconds rather than after a full render.
	 */
	assertFontsExist(args.fonts);
	assertFontCoversLabels(args.fonts, [
		...new Set(
			args.labelDeclarations.map(
				(d) => d.fontFamily ?? args.fonts[0]?.family ?? "Inter",
			),
		),
	]);

	const signal = args.signal ?? new AbortController().signal;
	const opened = await args.source.open({ signal, fetch });

	let zoom = args.zoom;

	if (zoom > opened.maxZoom) {
		warn.warn(
			"ZOOM_CLAMPED",
			`Zoom ${String(zoom)} clamped to ${String(opened.maxZoom)}.`,
			{ requested: args.zoom, applied: opened.maxZoom },
		);
		zoom = opened.maxZoom;
	}

	const bounds = computePixelBounds({
		center: args.center,
		zoom,
		width: args.width,
		height: args.height,
	});

	const { rules, sourceLayers } = resolveStyle({
		declarations: args.declarations,
		schema: args.source.schema,
		zoom,
		warn,
	});

	const labelLayers =
		args.labelDeclarations.length === 0
			? []
			: args.source.schema
					.resolve({ kind: "place" })
					.map((binding) => binding.sourceLayer);

	const cover = computeTileCover({
		bounds,
		displayZoom: zoom,
		maxDataZoom: opened.maxZoom,
	});

	const buffers = await fetchTiles({
		coords: cover.tiles,
		source: args.source,
		opened,
		cache: args.cache ?? sharedCache,
		signal,
		warn,
	});

	const wanted = [...new Set([...sourceLayers, ...labelLayers])];
	const features: DecodedFeature[] = [];

	for (const coord of cover.tiles) {
		const buffer = buffers.get(
			`${args.source.id}/${tileKey(coord, opened.version)}`,
		);

		if (!buffer) {
			continue;
		}

		features.push(
			...decodeTile({
				buffer,
				coord,
				tileDisplaySize: cover.tileDisplaySize,
				sourceLayers: wanted,
			}),
		);
	}

	const paths = buildPaths({
		features,
		rules,
		bounds,
		width: args.width,
		height: args.height,
	});

	const { overlays, reserved } = projectMarkers({
		markers: args.markers,
		zoom,
		bounds,
		width: args.width,
		height: args.height,
		warn,
	});

	const labels = placeLabels({
		candidates: buildLabelCandidates({
			args,
			features,
			zoom,
			bounds,
			labelLayers,
		}),
		reserved,
		width: args.width,
		height: args.height,
		warn,
	});

	const embeddedFonts =
		args.embedFonts === true ? await loadEmbeddableFonts(args.fonts, warn) : [];

	const svg = serializeScene({
		width: args.width,
		height: args.height,
		scale: args.scale ?? 1,
		background: args.background ?? DEFAULT_BACKGROUND,
		paths,
		labels,
		overlays,
		attribution: args.source.attribution,
		attributionPlacement: args.attributionPlacement ?? "bottom-right",
		embeddedFonts,
	});

	return {
		svg,
		width: args.width,
		height: args.height,
		warnings: warn.warnings,
	};
}
