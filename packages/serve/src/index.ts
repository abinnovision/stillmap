/*
 * The public surface, listed rather than re-exported wholesale.
 *
 * Deliberately absent: `renderKey`, `canonicalQuery`, `buildImageResponse`,
 * `notModified`, `etagMatches` and `IMMUTABLE`. They are how the handler is
 * built, not how it is used, and exporting them would freeze the internals of
 * the request path as API.
 */

export { SIGNATURE_PARAM } from "./query.js";

export {
	createMapServer,
	EPOCH_PARAM,
	TEMPLATE_PARAM,
	VERSION_PARAM,
} from "./server.js";
export type {
	MapServer,
	MapServerConfig,
	MapUrlOptions,
	MapUrlParams,
	RenderInfo,
	SigningConfig,
} from "./server.js";

export { signQuery, verifyQuery } from "./signing.js";
export type { Secret } from "./signing.js";

export { createCoalescer } from "./single-flight.js";
export type { Coalescer } from "./single-flight.js";

export { memoizedSource } from "./source.js";
export type { MemoizedSourceOptions } from "./source.js";

export { cacheStore, fileStore, nullStore } from "./store/index.js";
export type { Bytes, CacheStoreOptions, OutputStore } from "./store/index.js";

export {
	clamp,
	defineTemplate,
	invalidParams,
	InvalidParamsError,
	notFound,
	readNumber,
	readString,
	readViewport,
} from "./template.js";
export type {
	Format,
	MapTemplate,
	NumberBounds,
	TemplateContext,
	Viewport,
	ViewportLimits,
} from "./template.js";

/** Package version, replaced at release time by release-please. */
export const VERSION = "0.0.0";
