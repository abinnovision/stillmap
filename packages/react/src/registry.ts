import type {
	AttributionDeclaration,
	FontFace,
	LabelDeclaration,
	LayerDeclaration,
	MarkerDeclaration,
	WarningCollector,
} from "@stillmap/core";
import type { ReactElement } from "react";

/**
 * Marks a function as a stillmap component. `Symbol.for` rather than a private
 * symbol so two copies of the package in one dependency tree still recognise
 * each other's elements.
 */
export const STILLMAP_KIND = Symbol.for("stillmap.kind");

export type ComponentKind =
	"map" | "layer" | "labels" | "marker" | "attribution" | "font";

/** What a component's props convert to. `map` is handled by the walker. */
export type ProducedDeclaration =
	| LayerDeclaration
	| LabelDeclaration
	| MarkerDeclaration
	| AttributionDeclaration
	| FontFace
	| null;

/**
 * Everything a component needs beyond its props. Passing this explicitly keeps
 * the walker free of module-level mutable state, which would otherwise make two
 * concurrent renders share a warning collector.
 */
export interface DeclarationContext {
	readonly warn: WarningCollector;
}

export interface StillmapMeta<P> {
	readonly [STILLMAP_KIND]: ComponentKind;
	readonly displayName: string;
	readonly toDeclaration: (
		props: P,
		context: DeclarationContext,
	) => ProducedDeclaration;
}

export type StillmapComponent<P> = ((props: P) => ReactElement | null) &
	StillmapMeta<P>;

/**
 * Builds a component that is never rendered. It exists so the walker can
 * recognise the element and convert its props; calling it returns null, which
 * keeps it harmless if it ever reaches a real React renderer.
 */
export function defineComponent<P>(
	displayName: string,
	kind: ComponentKind,
	toDeclaration: (props: P, context: DeclarationContext) => ProducedDeclaration,
): StillmapComponent<P> {
	const component = (): ReactElement | null => null;

	return Object.assign(component, {
		[STILLMAP_KIND]: kind,
		displayName,
		toDeclaration,
	}) as StillmapComponent<P>;
}

export function isStillmapComponent(
	value: unknown,
): value is StillmapComponent<unknown> {
	return typeof value === "function" && STILLMAP_KIND in value;
}
