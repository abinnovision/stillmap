import { createElement, isValidElement } from "react";

import { bundleTemplate } from "./bundle.js";
import { PreviewError } from "./errors.js";

import type { FunctionComponent, ReactElement } from "react";

/**
 * A template's default export: either a component, whose props come from an
 * optional `PreviewProps`, or an element that is already built.
 */
export type TemplateExport =
	| ReactElement
	| (FunctionComponent<never> & {
			readonly PreviewProps?: Readonly<Record<string, unknown>>;
	  });

function toElement(exported: unknown, file: string): ReactElement {
	if (exported === undefined || exported === null) {
		throw new PreviewError(
			"TEMPLATE_NO_DEFAULT_EXPORT",
			`${file} has no default export.`,
			"Export a map component, or an element, as the default export.",
		);
	}

	if (isValidElement(exported)) {
		return exported;
	}

	if (typeof exported === "function") {
		const component = exported as FunctionComponent<
			Readonly<Record<string, unknown>>
		> & {
			PreviewProps?: Readonly<Record<string, unknown>>;
		};

		return createElement(component, component.PreviewProps ?? {});
	}

	throw new PreviewError(
		"TEMPLATE_NOT_RENDERABLE",
		`The default export of ${file} is a ${typeof exported}, not a component or an element.`,
		"Export a function returning a <Map>, or a <Map> element.",
	);
}

/**
 * Bundles a template, imports it, and builds its element.
 *
 * Node cannot run JSX, and the bundle is always ESM regardless of the project's
 * module system, so the import needs no interop of its own.
 */
export async function loadTemplate(
	file: string,
	cache: string,
): Promise<ReactElement> {
	const specifier = await bundleTemplate(file, cache);
	/*
	 * The bundle is a real file that Node must load itself. The @vite-ignore
	 * keeps a Vite-based test runner from rewriting the import and resolving the
	 * bundle's external dependencies through its own conditions.
	 */
	const namespace = (await import(/* @vite-ignore */ specifier)) as Readonly<
		Record<string, unknown>
	>;

	return toElement(namespace["default"], file);
}
