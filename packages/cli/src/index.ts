import type { ReactElement } from "react";

export type { Template } from "./dev/discover.js";
export type { RenderFailure, RenderOk, RenderResponse } from "./dev/render.js";

/**
 * The shape `stillmap dev` expects from a template's default export.
 *
 * `PreviewProps` is read only by the previewer, never by `renderMap`, so it is
 * safe to leave on a component you also render in production.
 */
export interface MapTemplate<P extends object = Record<string, never>> {
	(props: P): ReactElement | null;
	PreviewProps?: P;
}

/** Package version, replaced at release time by release-please. */
export const VERSION = "0.0.0";
