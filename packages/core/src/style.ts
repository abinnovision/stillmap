import { matchesFilter } from "./filter.js";
import { resolveZoomable } from "./zoomable.js";

import type { LayerDeclaration } from "./declaration.js";
import type { DecodedFeature } from "./decode.js";
import type { Color, Filter } from "./filter.js";
import type { SourceLayerBinding, TileSchema } from "./source.js";
import type { WarningCollector } from "./warnings.js";

interface RuleBase {
	/** Declaration index. Also the paint order, back to front. */
	readonly order: number;
	readonly sourceLayer: string;
	readonly filter?: Filter;
}

export interface FillRule extends RuleBase {
	readonly kind: "fill";
	readonly fill: Color;
	readonly fillOpacity: number;
}

export interface LineRule extends RuleBase {
	readonly kind: "line";
	readonly stroke: Color;
	readonly width: number;
	readonly opacity: number;
	readonly dash?: readonly number[];
}

export type PaintRule = FillRule | LineRule;

export interface ResolveStyleArgs {
	readonly declarations: readonly LayerDeclaration[];
	readonly schema: TileSchema;
	readonly zoom: number;
	readonly warn: WarningCollector;
}

export interface ResolvedStyle {
	readonly rules: readonly PaintRule[];
	/** Distinct source layers to decode. Anything else is skipped. */
	readonly sourceLayers: readonly string[];
}

function combineFilters(
	binding: Filter | undefined,
	declaration: Filter | undefined,
): Filter | undefined {
	if (binding === undefined) {
		return declaration;
	}

	if (declaration === undefined) {
		return binding;
	}

	return (properties) =>
		matchesFilter(binding, properties) &&
		matchesFilter(declaration, properties);
}

function reportCoverage(
	target: { readonly kind: string; readonly classes?: readonly string[] },
	bindings: readonly SourceLayerBinding[],
	args: ResolveStyleArgs,
): void {
	if (bindings.length === 0) {
		args.warn.warn(
			"SCHEMA_KIND_UNSUPPORTED",
			`Schema "${args.schema.id}" has no layer for "${target.kind}".`,
			{ schema: args.schema.id, kind: target.kind },
		);

		return;
	}

	if (target.classes === undefined) {
		return;
	}

	const covered = new Set(bindings.flatMap((b) => b.classes ?? []));
	const unmapped = target.classes.filter((c) => !covered.has(c));

	// A binding that declares no classes covers the kind wholesale.
	if (unmapped.length > 0 && covered.size > 0) {
		args.warn.warn(
			"SCHEMA_CLASS_UNMAPPED",
			`Schema "${args.schema.id}" does not map ${unmapped
				.map((c) => `"${c}"`)
				.join(", ")} for "${target.kind}".`,
			{ schema: args.schema.id, kind: target.kind, classes: unmapped },
		);
	}
}

interface ToRuleArgs {
	readonly declaration: LayerDeclaration;
	readonly binding: SourceLayerBinding;
	readonly order: number;
	readonly zoom: number;
}

function toRule(args: ToRuleArgs): PaintRule {
	const { declaration, binding, order, zoom } = args;
	const filter = combineFilters(binding.filter, declaration.filter);
	const base = {
		order,
		sourceLayer: binding.sourceLayer,
		...(filter === undefined ? {} : { filter }),
	};

	if (declaration.kind === "fill") {
		return {
			...base,
			kind: "fill",
			fill: resolveZoomable(declaration.fill ?? "#000000", zoom),
			fillOpacity: resolveZoomable(declaration.fillOpacity ?? 1, zoom),
		};
	}

	return {
		...base,
		kind: "line",
		stroke: resolveZoomable(declaration.stroke ?? "#000000", zoom),
		width: resolveZoomable(declaration.width ?? 1, zoom),
		opacity: resolveZoomable(declaration.opacity ?? 1, zoom),
		...(declaration.dash === undefined
			? {}
			: { dash: resolveZoomable(declaration.dash, zoom) }),
	};
}

/**
 * Turns declarations into flat paint rules at one fixed zoom. Every zoom
 * function collapses to a literal here, exactly once per render.
 */
export function resolveStyle(args: ResolveStyleArgs): ResolvedStyle {
	const rules: PaintRule[] = [];
	const sourceLayers = new Set<string>();
	let order = 0;

	for (const declaration of args.declarations) {
		if (
			args.zoom < (declaration.minZoom ?? -Infinity) ||
			args.zoom > (declaration.maxZoom ?? Infinity)
		) {
			continue;
		}

		const bindings =
			declaration.target.mode === "raw"
				? [{ sourceLayer: declaration.target.sourceLayer }]
				: args.schema.resolve({
						kind: declaration.target.kind,
						...(declaration.target.classes === undefined
							? {}
							: { classes: declaration.target.classes }),
					});

		if (declaration.target.mode === "canonical") {
			reportCoverage(declaration.target, bindings, args);
		}

		for (const binding of bindings) {
			sourceLayers.add(binding.sourceLayer);
			rules.push(toRule({ declaration, binding, order, zoom: args.zoom }));
		}

		order++;
	}

	return { rules, sourceLayers: [...sourceLayers] };
}

/**
 * The first rule matching a feature, or `null` when the feature is not part of
 * the style. Rules are ordered back to front, so the first match wins.
 */
export function resolveRule(
	feature: Pick<DecodedFeature, "layer" | "properties">,
	rules: readonly PaintRule[],
): PaintRule | null {
	for (const rule of rules) {
		if (rule.sourceLayer !== feature.layer) {
			continue;
		}

		if (!matchesFilter(rule.filter, feature.properties)) {
			continue;
		}

		return rule;
	}

	return null;
}
