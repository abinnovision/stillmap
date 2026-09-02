import { createRequire } from "node:module";
import { Fragment, isValidElement } from "react";

import type { WarningCollector } from "@stillmap/core";
import type { ReactElement, ReactNode } from "react";
import type * as ReactDomServer from "react-dom/server";

/**
 * SVG elements resvg renders. Anything else, `foreignObject` included, is
 * dropped: resvg does not handle it dependably and silently produces nothing.
 */
const ALLOWED = new Set([
	"a",
	"circle",
	"clipPath",
	"defs",
	"ellipse",
	"g",
	"image",
	"line",
	"linearGradient",
	"marker",
	"mask",
	"path",
	"pattern",
	"polygon",
	"polyline",
	"radialGradient",
	"rect",
	"stop",
	"svg",
	"symbol",
	"text",
	"textPath",
	"title",
	"tspan",
	"use",
]);

function validateElement(
	element: ReactElement,
	warn: WarningCollector,
): boolean {
	const props = element.props as Readonly<Record<string, unknown>>;

	if (element.type === Fragment) {
		return validate(props["children"] as ReactNode, warn);
	}

	if (typeof element.type === "function") {
		// A user's own component inside a marker: call it, validate the result.
		const rendered = (element.type as (p: unknown) => ReactNode)(props);

		return validate(rendered, warn);
	}

	const tag = element.type;

	if (typeof tag !== "string") {
		warn.warn(
			"MARKER_UNSUPPORTED_ELEMENT",
			"A marker child was not a plain SVG element, and was dropped.",
		);

		return false;
	}

	if (!ALLOWED.has(tag)) {
		warn.warn(
			"MARKER_UNSUPPORTED_ELEMENT",
			`<${tag}> is not an SVG element resvg renders, and was dropped.`,
			{ tag },
		);

		return false;
	}

	if (tag === "image") {
		const href = props["href"] ?? props["xlinkHref"];

		if (typeof href === "string" && !href.startsWith("data:")) {
			warn.warn(
				"MARKER_IMAGE_NOT_INLINE",
				"resvg fetches nothing, so an <image> needs a data: URI.",
				{ href },
			);

			return false;
		}
	}

	return validate(props["children"] as ReactNode, warn);
}

function validate(node: ReactNode, warn: WarningCollector): boolean {
	if (node === null || node === undefined || typeof node === "boolean") {
		return true;
	}

	if (node instanceof Array) {
		return node.every((child) => validate(child as ReactNode, warn));
	}

	if (typeof node === "string" || typeof node === "number") {
		return true;
	}

	if (!isValidElement(node)) {
		return true;
	}

	return validateElement(node, warn);
}

type ServerRenderer = typeof ReactDomServer;

let cached: ServerRenderer | null = null;

/**
 * `react-dom/server` is loaded on first use rather than imported at the top of
 * the file. A static import makes this module unbundlable by frameworks that
 * refuse `react-dom/server` in a server graph, Next's App Router among them,
 * and markers are the only thing that needs it.
 */
function serverRenderer(): ServerRenderer {
	cached ??= createRequire(import.meta.url)(
		"react-dom/server",
	) as ServerRenderer;

	return cached;
}

/**
 * Validates a marker subtree, then renders it. Returns the markup, or an empty
 * string when nothing survived validation.
 */
export function renderOverlay(
	children: ReactNode,
	warn: WarningCollector,
): string {
	if (!validate(children, warn)) {
		return "";
	}

	return serverRenderer().renderToStaticMarkup(<Fragment>{children}</Fragment>);
}
