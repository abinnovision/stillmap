import type { FontFace, LngLat, TileSource } from "@stillmap/core";
import type { ReactElement } from "react";

export type Format = "png" | "svg";

/** Everything a template gets. The query is yours to read as you like. */
export interface TemplateContext {
	readonly query: URLSearchParams;
	/**
	 * The server's shared tile source. Hoisted so one memoised handle is reused
	 * across every template and every request.
	 */
	readonly source: TileSource;
	/** The server's fonts, to be declared as `<Font>` children of the map. */
	readonly fonts: readonly FontFace[];
}

/*
 * Deliberately absent from the context: the `Request`. The render key is built
 * from the query alone, so anything read from a header or a cookie would decide
 * the bytes while being invisible to the cache, and those bytes are then stored
 * and served `immutable`. A map that varies by tenant header would be served to
 * the wrong tenant, permanently. Put whatever it depends on in the query.
 */

export interface MapTemplate {
	/** Default `"png"`. */
	readonly format?: Format;
	/** Device pixel ratio applied to the output. Default 2. */
	readonly scale?: number;
	/**
	 * The current version of this map's underlying data. A request carrying a
	 * different version is redirected to the current URL rather than answered
	 * with current pixels, which is what makes an immutable response honest.
	 *
	 * This cannot be folded into `render`: the comparison has to happen before
	 * anything is rendered, and it is the natural place to look your data up,
	 * so throwing `notFound()` here rejects before any work at all.
	 *
	 * Two obligations. It must be a pure function of the parameters it is given,
	 * which never include `t`, `v`, `e` or `sig`, or minting and verifying will
	 * disagree and the request will redirect in a loop. And it runs on every
	 * request, ahead of the ETag check, so it should be a cache lookup rather
	 * than a query if your data lives in a database.
	 */
	readonly version?: (query: URLSearchParams) => string | Promise<string>;
	readonly render: (context: TemplateContext) => ReactElement;
}

/** Identity. Exists so a template literal is checked where it is written. */
export function defineTemplate(template: MapTemplate): MapTemplate {
	return template;
}

export class InvalidParamsError extends Error {
	public override readonly name = "InvalidParamsError";
	public readonly status: number;

	public constructor(message: string, status = 400) {
		super(message);
		this.status = status;
	}
}

/**
 * Rejects a request with a 400. The message reaches the client, so it is for
 * describing the parameter, not the failure. Throw it from `version` to reject
 * before any work, or from `render` to reject during it.
 */
export function invalidParams(message: string): InvalidParamsError {
	return new InvalidParamsError(message);
}

/**
 * Rejects a request with a 404, for a parameter that is well formed but names
 * something that does not exist.
 */
export function notFound(message: string): InvalidParamsError {
	return new InvalidParamsError(message, 404);
}

export function clamp(value: number, low: number, high: number): number {
	return Math.min(Math.max(value, low), high);
}

/** A required string parameter. */
export function readString(query: URLSearchParams, name: string): string {
	const value = query.get(name);

	if (value === null || value === "") {
		throw invalidParams(`"${name}" is required`);
	}

	return value;
}

export interface NumberBounds {
	readonly min?: number;
	readonly max?: number;
	/** Round to a whole number. Pixel dimensions want this. */
	readonly integer?: boolean;
}

/**
 * A required numeric parameter, clamped to `bounds`.
 *
 * Pass bounds for anything that decides how much work the server does. Every
 * URL is signed, so the value came from your own code, but a signature proves
 * who minted a URL rather than that the code minting it was right: a bug that
 * puts user input into `maps.url()` signs the attack faithfully.
 */
export function readNumber(
	query: URLSearchParams,
	name: string,
	bounds: NumberBounds = {},
): number {
	const value = Number(readString(query, name));

	if (!Number.isFinite(value)) {
		throw invalidParams(`"${name}" must be a number`);
	}

	const clamped = clamp(
		value,
		bounds.min ?? Number.NEGATIVE_INFINITY,
		bounds.max ?? Number.POSITIVE_INFINITY,
	);

	return bounds.integer === true ? Math.round(clamped) : clamped;
}

/** Web Mercator stops here, so a latitude beyond it has no projection. */
const MAX_LATITUDE = 85.0511;

export interface ViewportLimits {
	readonly maxWidth?: number;
	readonly maxHeight?: number;
	readonly minZoom?: number;
	readonly maxZoom?: number;
}

export interface Viewport {
	readonly center: LngLat;
	readonly zoom: number;
	readonly width: number;
	readonly height: number;
}

/**
 * Reads `lng`, `lat`, `zoom`, `width` and `height` from the query, clamped.
 *
 * Every URL this server answers is signed, so these values only ever came from
 * your own code. Clamp them anyway: the signature proves who minted the URL,
 * not that the code minting it was right. A bug that puts user input into
 * `maps.url()` produces a perfectly valid signature over an attack.
 */
export function readViewport(
	query: URLSearchParams,
	limits: ViewportLimits = {},
): Viewport {
	return {
		center: [
			readNumber(query, "lng", { min: -180, max: 180 }),
			readNumber(query, "lat", { min: -MAX_LATITUDE, max: MAX_LATITUDE }),
		],
		zoom: readNumber(query, "zoom", {
			min: limits.minZoom ?? 0,
			max: limits.maxZoom ?? 18,
		}),
		width: readNumber(query, "width", {
			min: 1,
			max: limits.maxWidth ?? 1280,
			integer: true,
		}),
		height: readNumber(query, "height", {
			min: 1,
			max: limits.maxHeight ?? 1280,
			integer: true,
		}),
	};
}
