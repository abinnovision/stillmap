import { Fragment, isValidElement } from "react";

import { STILLMAP_KIND, isStillmapComponent } from "./registry.js";

import type { DeclarationContext, StillmapComponent } from "./registry.js";
import type {
	AttributionDeclaration,
	FontFace,
	LabelDeclaration,
	LayerDeclaration,
	MarkerDeclaration,
	WarningCollector,
} from "@stillmap/core";
import type { ReactElement, ReactNode } from "react";

export interface WalkResult {
	/** Props of the `<Map>` element, once one is found. */
	readonly map: Readonly<Record<string, unknown>> | null;
	readonly fonts: readonly FontFace[];
	readonly layers: readonly LayerDeclaration[];
	readonly labels: readonly LabelDeclaration[];
	readonly markers: readonly MarkerDeclaration[];
	readonly attribution: AttributionDeclaration | null;
}

interface Sink {
	map: Readonly<Record<string, unknown>> | null;
	fonts: FontFace[];
	layers: LayerDeclaration[];
	labels: LabelDeclaration[];
	markers: MarkerDeclaration[];
	attribution: AttributionDeclaration | null;
	readonly context: DeclarationContext;
}

function collect(
	component: StillmapComponent<unknown>,
	props: Readonly<Record<string, unknown>>,
	sink: Sink,
): void {
	const kind = component[STILLMAP_KIND];
	const declaration = component.toDeclaration(props, sink.context);

	if (declaration === null) {
		return;
	}

	switch (kind) {
		case "font":
			sink.fonts.push(declaration as FontFace);
			break;
		case "layer":
			sink.layers.push(declaration as LayerDeclaration);
			break;
		case "labels":
			sink.labels.push(declaration as LabelDeclaration);
			break;
		case "marker":
			sink.markers.push(declaration as MarkerDeclaration);
			break;
		case "attribution":
			sink.attribution = declaration as AttributionDeclaration;
			break;
		default:
			break;
	}
}

function visitElement(element: ReactElement, sink: Sink): void {
	const props = element.props as Readonly<Record<string, unknown>>;
	const warn = sink.context.warn;

	if (element.type === Fragment) {
		visit(props["children"] as ReactNode, sink);

		return;
	}

	if (isStillmapComponent(element.type)) {
		if (element.type[STILLMAP_KIND] === "map") {
			if (sink.map !== null) {
				warn.warn("UNKNOWN_ELEMENT", "A nested <Map> was ignored.");

				return;
			}

			sink.map = props;
			visit(props["children"] as ReactNode, sink);

			return;
		}

		collect(element.type, props, sink);

		return;
	}

	if (typeof element.type === "function") {
		/*
		 * A user's own component: call it and walk what it returns. This is what
		 * makes a reusable style just a component.
		 */
		const rendered = (element.type as (p: unknown) => ReactNode)(props);

		visit(rendered, sink);

		return;
	}

	// Everything else has been handled, so this is a host element such as <div>.
	const type = element.type;

	warn.warn(
		"UNKNOWN_ELEMENT",
		`<${type}> is not a stillmap component and was ignored.`,
		{ type },
	);
}

function visit(node: ReactNode, sink: Sink): void {
	if (node === null || node === undefined || typeof node === "boolean") {
		return;
	}

	if (node instanceof Array) {
		for (const child of node) {
			visit(child as ReactNode, sink);
		}

		return;
	}

	if (typeof node === "string" || typeof node === "number") {
		const text = typeof node === "number" ? node.toString() : node;

		sink.context.warn.warn(
			"UNKNOWN_ELEMENT",
			`Stray text "${text}" is not part of a map.`,
			{ text },
		);

		return;
	}

	if (!isValidElement(node)) {
		sink.context.warn.warn(
			"UNKNOWN_ELEMENT",
			"Encountered a node that is not a valid element.",
		);

		return;
	}

	visitElement(node, sink);
}

/**
 * Reads a JSX tree into declarations. There is no reconciler: a user function
 * component is called directly, which supports composition and conditionals but
 * not hooks, context, or async components.
 */
export function walk(node: ReactNode, warn: WarningCollector): WalkResult {
	const sink: Sink = {
		map: null,
		fonts: [],
		layers: [],
		labels: [],
		markers: [],
		attribution: null,
		context: { warn },
	};

	visit(node, sink);

	return sink;
}
