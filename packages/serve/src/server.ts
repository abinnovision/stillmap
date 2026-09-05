import { renderMap } from "@stillmap/react";

import { renderKey } from "./key.js";
import { SIGNATURE_PARAM } from "./query.js";
import {
	buildImageResponse,
	etagMatches,
	IMMUTABLE,
	notModified,
} from "./response.js";
import { signQuery, verifyQuery } from "./signing.js";
import { createCoalescer } from "./single-flight.js";
import { nullStore } from "./store/index.js";
import { InvalidParamsError } from "./template.js";

import type { Secret } from "./signing.js";
import type { Bytes, OutputStore } from "./store/index.js";
import type { Format, MapTemplate } from "./template.js";
import type { FontFace, RenderWarning, TileSource } from "@stillmap/core";

/** Selects the template. */
export const TEMPLATE_PARAM = "t";
/** Carries the data version, which is what makes an immutable response safe. */
export const VERSION_PARAM = "v";
/** Carries the code version. See `MapServerConfig.epoch`. */
export const EPOCH_PARAM = "e";

/** Parameters the server owns. A template's own parameters may not use them. */
const RESERVED = new Set([
	TEMPLATE_PARAM,
	VERSION_PARAM,
	EPOCH_PARAM,
	SIGNATURE_PARAM,
]);

export interface SigningConfig {
	readonly secret: Secret;
}

export interface MapServerConfig<
	T extends Readonly<Record<string, MapTemplate>>,
> {
	readonly templates: T;
	/**
	 * Required. Templates read the query directly, so the signature is the only
	 * thing standing between a URL and a render: it is what makes "these are the
	 * parameters my own code chose" true. Pass an array to rotate: the first
	 * signs, any of them verifies.
	 */
	readonly signing: SigningConfig;
	/** Shared across every template. Wrap it in `memoizedSource()`. */
	readonly source: TileSource;
	/**
	 * Where rendered bytes live between requests. Defaults to no caching, which
	 * renders on every request: fine for trying this out, and an unbounded
	 * render proxy in production.
	 */
	readonly store?: OutputStore;
	readonly fonts?: readonly FontFace[];
	/** The path the handler is mounted at. Used to build URLs. Default `"/"`. */
	readonly basePath?: string;
	/**
	 * The version of everything a template decides in code rather than reading
	 * from the query: its layers, its style, its `format`, its `scale`. Bump it
	 * after changing any of them.
	 *
	 * It appears in every minted URL, which is the only thing that can
	 * invalidate an `immutable` response. Keeping it out of the URL would
	 * invalidate the server's own store and nothing else, leaving every browser
	 * and CDN holding the old map for a year.
	 */
	readonly epoch?: string;
	/**
	 * How many renders may run at once. Rasterising is a synchronous native
	 * call, so each one blocks the event loop and holds a full pixmap; without a
	 * bound, a burst of cold keys is an outage rather than a slow page. Default
	 * 4. Requests above it wait rather than fail.
	 */
	readonly maxConcurrentRenders?: number;
	/** Shared-cache lifetime for URLs with no version. Default one day. */
	readonly maxAge?: number;
	readonly onWarning?: (warning: RenderWarning, request: Request) => void;
	readonly onError?: (error: unknown, request: Request) => void;
	/**
	 * Called only when a request actually rendered, which is what makes a cache
	 * hit distinguishable from a miss.
	 */
	readonly onRender?: (info: RenderInfo, request: Request) => void;
}

export interface RenderInfo {
	readonly key: string;
	readonly durationMs: number;
	/**
	 * True when a tile could not be fetched. The map is incomplete, so it was
	 * served but deliberately not cached.
	 */
	readonly degraded: boolean;
}

export type MapUrlParams = Readonly<
	Record<string, string | number | boolean | undefined>
>;

export interface MapUrlOptions {
	/** Makes the result absolute. Any URL on the target origin will do. */
	readonly base?: string | URL;
}

export interface MapServer<T> {
	/** A route handler. `export const GET = maps.fetch` is the whole wiring. */
	readonly fetch: (request: Request) => Promise<Response>;
	/**
	 * Builds and signs a URL this handler will answer. The only way to produce
	 * one. Asynchronous because a template's `version` may need to look its data
	 * up.
	 */
	readonly url: (
		template: keyof T & string,
		params?: MapUrlParams,
		options?: MapUrlOptions,
	) => Promise<string>;
}

interface RenderArgs {
	readonly request: Request;
	readonly query: URLSearchParams;
	readonly template: MapTemplate;
	readonly format: Format;
	readonly scale: number;
}

interface BuildArgs {
	readonly name: string;
	readonly params: MapUrlParams;
	readonly version: string | undefined;
	readonly base?: string | URL;
}

interface RenderedOutput {
	readonly bytes: Bytes;
	readonly degraded: boolean;
}

export function createMapServer<
	T extends Readonly<Record<string, MapTemplate>>,
>(config: MapServerConfig<T>): MapServer<T> {
	const templates: Readonly<Record<string, MapTemplate>> = config.templates;
	const store = config.store ?? nullStore();
	const fonts = config.fonts ?? [];
	const basePath = config.basePath ?? "/";
	const epoch = config.epoch ?? "1";
	const maxAge = config.maxAge ?? 86_400;
	const secret = config.signing.secret;

	if (typeof secret === "string" ? secret === "" : secret.length === 0) {
		throw new Error(
			"createMapServer() needs a signing secret. Every URL is signed, so an " +
				"empty secret would sign nothing while looking like it worked.",
		);
	}

	/* Per server. A shared one would let two servers answer each other. */
	const coalesce = createCoalescer();
	const gate = createGate(config.maxConcurrentRenders ?? 4);

	const build = (args: BuildArgs): string => {
		const { name, params, version } = args;
		const query = new URLSearchParams();

		/*
		 * Sorted, so the same map always produces the same URL string. Two
		 * spellings of one URL would be two entries in every cache downstream,
		 * and two renders.
		 */
		for (const [key, value] of Object.entries(params).sort()) {
			/* An absent value would otherwise be signed as the string "undefined". */
			if (value !== undefined) {
				query.set(key, String(value));
			}
		}

		query.set(TEMPLATE_PARAM, name);
		query.set(EPOCH_PARAM, epoch);

		if (version !== undefined) {
			query.set(VERSION_PARAM, version);
		}

		query.set(SIGNATURE_PARAM, signQuery(secret, query));

		const relative = `${basePath}?${query.toString()}`;

		return args.base === undefined
			? relative
			: new URL(relative, args.base).toString();
	};

	const url = async (
		name: string,
		params: MapUrlParams = {},
		options: MapUrlOptions = {},
	): Promise<string> => {
		if (!Object.hasOwn(templates, name)) {
			throw new Error(`Unknown map template "${name}"`);
		}

		/* A programming error, so it is checked before the template runs. */
		for (const key of Object.keys(params)) {
			if (RESERVED.has(key)) {
				throw new Error(
					`"${key}" is reserved by @stillmap/serve and cannot be a template parameter.`,
				);
			}
		}

		const template = templates[name] as MapTemplate;

		/*
		 * `version` sees only the template's own parameters, exactly as it will
		 * on the way back in, so minting and checking can never disagree.
		 */
		return build({
			name,
			params,
			version: await versionOf(template, params),
			...(options.base === undefined ? {} : { base: options.base }),
		});
	};

	const versionOf = async (
		template: MapTemplate,
		params: MapUrlParams,
	): Promise<string | undefined> => {
		if (template.version === undefined) {
			return undefined;
		}

		const query = new URLSearchParams();

		for (const [key, value] of Object.entries(params).sort()) {
			if (value !== undefined) {
				query.set(key, String(value));
			}
		}

		return await template.version(query);
	};

	const fetch = async (request: Request): Promise<Response> => {
		try {
			return await handle(request);
		} catch (error) {
			/*
			 * A template rejects by throwing, from `version` before any work or
			 * from `render` during it. Either way the status is the template's
			 * choice and the message is written for the client.
			 */
			if (error instanceof InvalidParamsError) {
				return fail(error.status, error.message);
			}

			config.onError?.(error, request);

			return fail(500, "Map render failed");
		}
	};

	const handle = async (request: Request): Promise<Response> => {
		if (request.method !== "GET" && request.method !== "HEAD") {
			return fail(405, "Method not allowed");
		}

		const query = new URL(request.url).searchParams;

		/*
		 * Before the template is even looked up, so an unsigned caller cannot
		 * tell a real template name from an invented one.
		 */
		if (!verifyQuery(secret, query)) {
			return fail(403, "Invalid signature");
		}

		const name = query.get(TEMPLATE_PARAM);

		if (name === null || !Object.hasOwn(templates, name)) {
			return fail(404, "Unknown map template");
		}

		const template = templates[name] as MapTemplate;

		/*
		 * A stale URL must not be answered with current pixels: it is served
		 * immutable, so the lie would be cached forever. Redirect to the live URL
		 * instead, re-signed on the way out. Both versions matter: `v` is the
		 * data's, `e` is the code's.
		 */
		const own = ownParams(query);
		/* Once per request: the same value decides the check and the target. */
		const current = await versionOf(template, own);

		if (
			query.get(EPOCH_PARAM) !== epoch ||
			(current !== undefined && query.get(VERSION_PARAM) !== current)
		) {
			const target = build({ name, params: own, version: current });

			/*
			 * A `version` that is not a pure function of the template's own
			 * parameters returns something different here than it did at mint
			 * time, which would redirect to the URL we were just given, forever.
			 * Serve it instead, and report the broken contract.
			 */
			if (sameRequest(target, request.url)) {
				config.onError?.(
					new Error(
						`Map template "${name}" redirected to itself: its \`version\` is not a pure function of its parameters.`,
					),
					request,
				);
			} else {
				return redirect(target);
			}
		}

		const format: Format = template.format ?? "png";
		const scale = template.scale ?? 2;
		const key = renderKey({ epoch, query, format, scale });
		const cacheControl =
			query.get(VERSION_PARAM) === null
				? `public, max-age=0, s-maxage=${String(maxAge)}, stale-while-revalidate=604800`
				: IMMUTABLE;

		/*
		 * Answered before the store is touched and before anything is rendered,
		 * because the key comes from the request rather than from the bytes.
		 */
		if (etagMatches(request.headers.get("if-none-match"), key)) {
			return notModified(key, cacheControl);
		}

		const storeKey = `${key}.${format}`;
		const cached = await store.get(storeKey);
		const output: RenderedOutput =
			cached === null
				? await coalesce(storeKey, async () => {
						/*
						 * Timed and reported inside the gate, so `durationMs` is how
						 * long the render took rather than how long it queued.
						 */
						const fresh = await gate(async () => {
							const started = performance.now();
							const output = await render({
								request,
								query,
								template,
								format,
								scale,
							});

							config.onRender?.(
								{
									key,
									durationMs: performance.now() - started,
									degraded: output.degraded,
								},
								request,
							);

							return output;
						});

						/*
						 * An incomplete map is a valid image of nothing much. Caching
						 * one behind an immutable URL would make a transient tile
						 * failure permanent, so it is served and forgotten.
						 */
						if (!fresh.degraded) {
							await store
								.set(storeKey, fresh.bytes)
								.catch((error: unknown) => config.onError?.(error, request));
						}

						return fresh;
					})
				: { bytes: cached, degraded: false };

		return buildImageResponse({
			bytes: output.bytes,
			etag: key,
			cacheControl: output.degraded ? "no-store" : cacheControl,
			contentType: format === "png" ? "image/png" : "image/svg+xml",
		});
	};

	const render = async (args: RenderArgs): Promise<RenderedOutput> => {
		const { request, format, scale } = args;
		const element = args.template.render({
			query: args.query,
			source: config.source,
			fonts,
		});

		const warnings: RenderWarning[] = [];
		const onWarning = (warning: RenderWarning): void => {
			warnings.push(warning);
			config.onWarning?.(warning, request);
		};

		/*
		 * No `signal`. The render is shared by every waiter on this key, so
		 * binding it to one client's connection would let a browser that
		 * cancelled a lazy image fail everyone else's request, and would let
		 * anyone poison a cold key by hanging up mid-render.
		 */
		const bytes =
			format === "png"
				? /*
					 * Copies out of the Buffer rather than viewing it. A Buffer is a
					 * view into a shared pool slab, and this drops both that alias and
					 * the `ArrayBufferLike` type that keeps a Buffer out of `BodyInit`.
					 */
					new Uint8Array(
						(await renderMap(element, { format: "png", scale, onWarning })).png,
					)
				: new TextEncoder().encode(
						(await renderMap(element, { format: "svg", scale, onWarning })).svg,
					);

		return {
			bytes,
			degraded: warnings.some(
				(warning) => warning.code === "TILE_FETCH_FAILED",
			),
		};
	};

	return { fetch, url };
}

/** The template's own parameters, with the ones the server owns removed. */
function ownParams(query: URLSearchParams): Record<string, string> {
	/* Null-prototype, so a parameter named `__proto__` is a value not a mutation. */
	const params: Record<string, string> = Object.create(null) as Record<
		string,
		string
	>;

	for (const [name, value] of query) {
		if (!RESERVED.has(name)) {
			params[name] = value;
		}
	}

	return params;
}

function sameRequest(target: string, requestUrl: string): boolean {
	const a = new URL(target, requestUrl);
	const b = new URL(requestUrl);

	a.searchParams.sort();
	b.searchParams.sort();

	return a.pathname === b.pathname && a.search === b.search;
}

/**
 * A relative `Location`, which RFC 7231 permits, so the redirect never depends
 * on a `Host` header the server did not choose. `no-store`, because a 308 is
 * cacheable by default and this one stops being true the moment the data moves.
 */
function redirect(location: string): Response {
	return new Response(null, {
		status: 308,
		headers: { "Cache-Control": "no-store", Location: location },
	});
}

/** Lets `limit` jobs run at once and queues the rest. */
function createGate(limit: number): <T>(job: () => Promise<T>) => Promise<T> {
	const waiting: (() => void)[] = [];
	let active = 0;

	const release = (): void => {
		active -= 1;
		waiting.shift()?.();
	};

	return async <T>(job: () => Promise<T>): Promise<T> => {
		if (active >= limit) {
			await new Promise<void>((resolve) => {
				waiting.push(resolve);
			});
		}

		active += 1;

		try {
			return await job();
		} finally {
			release();
		}
	};
}

function fail(status: number, message: string): Response {
	return new Response(message, {
		status,
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
}
