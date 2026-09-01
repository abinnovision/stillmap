import { defineTileSource } from "@stillmap/core";

import type {
	Attribution,
	OpenContext,
	OpenTileSource,
	TileCoord,
	TileSchema,
	TileSource,
} from "@stillmap/core";

const FETCH_TIMEOUT_MS = 10_000;

export function buildTileUrl(template: string, coord: TileCoord): string {
	return template
		.replace("{z}", String(coord.z))
		.replace("{x}", String(coord.column))
		.replace("{y}", String(coord.y));
}

export interface TileJson {
	readonly tiles: readonly string[];
	readonly minzoom?: number;
	readonly maxzoom?: number;
}

export async function resolveTileJson(
	url: string,
	context: OpenContext,
): Promise<TileJson> {
	const response = await context.fetch(url, { signal: context.signal });

	if (!response.ok) {
		throw new Error(
			`TileJSON request to ${url} failed with ${String(response.status)}`,
		);
	}

	const json = (await response.json()) as TileJson;

	if (!(json.tiles instanceof Array) || json.tiles[0] === undefined) {
		throw new Error(`TileJSON at ${url} declares no tile template`);
	}

	return json;
}

export interface HttpTileSourceOptions {
	readonly id: string;
	readonly schema: TileSchema;
	readonly attribution: readonly Attribution[];
	/** A fixed `{z}/{x}/{y}` template. Mutually exclusive with `tilejson`. */
	readonly template?: string;
	/** A TileJSON endpoint resolved on every open. */
	readonly tilejson?: string;
	readonly minZoom?: number;
	readonly maxZoom?: number;
}

async function openHttp(
	options: HttpTileSourceOptions,
	context: OpenContext,
): Promise<OpenTileSource> {
	const resolved: TileJson =
		options.tilejson === undefined
			? { tiles: [options.template ?? ""] }
			: await resolveTileJson(options.tilejson, context);

	const template = resolved.tiles[0] ?? "";

	if (template === "") {
		throw new Error(
			`Source "${options.id}" has neither a template nor a tilejson URL`,
		);
	}

	return {
		minZoom: resolved.minzoom ?? options.minZoom ?? 0,
		maxZoom: resolved.maxzoom ?? options.maxZoom ?? 14,
		/*
		 * The template path changes when upstream rotates its URL, which is
		 * exactly the signal the tile cache needs.
		 */
		version: new URL(template.replace(/\{[zxy]\}/g, "0")).pathname,
		fetchTile: async (coord, signal): Promise<ArrayBuffer | null> => {
			const response = await context.fetch(buildTileUrl(template, coord), {
				signal: AbortSignal.any([
					signal,
					AbortSignal.timeout(FETCH_TIMEOUT_MS),
				]),
			});

			// Oceans and areas outside coverage legitimately have no tile.
			if (response.status === 404 || response.status === 204) {
				return null;
			}

			if (!response.ok) {
				throw new Error(`Tile request failed with ${String(response.status)}`);
			}

			const buffer = await response.arrayBuffer();

			return buffer.byteLength === 0 ? null : buffer;
		},
	};
}

/**
 * A source backed by HTTP tile requests. TileJSON is re-resolved on every open
 * because providers rotate their tile URL, and a stale template 404s the whole
 * viewport rather than failing loudly.
 */
export function httpTileSource(options: HttpTileSourceOptions): TileSource {
	return defineTileSource({
		id: options.id,
		schema: options.schema,
		attribution: options.attribution,
		open: async (context) => await openHttp(options, context),
	});
}
