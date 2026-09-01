import { tileKey } from "./tile-cover.js";

import type { OpenTileSource, TileSource } from "./source.js";
import type { TileCoord } from "./tile-cover.js";
import type { WarningCollector } from "./warnings.js";

const FETCH_CONCURRENCY = 6;
const RETRY_DELAYS_MS = [250, 1000];
const DEFAULT_CACHE_LIMIT = 150;

export interface TileCache {
	get: (key: string) => ArrayBuffer | null | undefined;
	set: (key: string, value: ArrayBuffer | null) => void;
	readonly size: number;
}

/**
 * Least-recently-used cache shared across renders. Repeated renders of the same
 * area, and both variants of one map, reuse the same downloads.
 */
export function createTileCache(limit = DEFAULT_CACHE_LIMIT): TileCache {
	const entries = new Map<string, ArrayBuffer | null>();

	return {
		get size() {
			return entries.size;
		},
		get(key) {
			if (!entries.has(key)) {
				return undefined;
			}

			// Refresh recency so eviction order stays least-recently-used.
			const value = entries.get(key) ?? null;

			entries.delete(key);
			entries.set(key, value);

			return value;
		},
		set(key, value) {
			entries.set(key, value);

			while (entries.size > limit) {
				const oldest = entries.keys().next().value;

				if (oldest === undefined) {
					break;
				}

				entries.delete(oldest);
			}
		},
	};
}

async function sleep(ms: number): Promise<void> {
	await new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});
}

async function fetchWithRetry(
	opened: OpenTileSource,
	coord: TileCoord,
	signal: AbortSignal,
): Promise<ArrayBuffer | null> {
	let lastError: unknown = null;

	for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
		try {
			return await opened.fetchTile(coord, signal);
		} catch (error) {
			lastError = error;

			const delay = RETRY_DELAYS_MS.at(attempt);

			if (delay === undefined || signal.aborted) {
				break;
			}

			await sleep(delay);
		}
	}

	throw lastError instanceof Error ? lastError : new Error("Tile fetch failed");
}

export interface FetchTilesArgs {
	readonly coords: readonly TileCoord[];
	readonly source: TileSource;
	readonly opened: OpenTileSource;
	readonly cache: TileCache;
	readonly signal: AbortSignal;
	readonly warn: WarningCollector;
}

/**
 * Downloads the given tiles with bounded concurrency. A `null` value means the
 * tile carries no data, either legitimately (ocean) or because it failed after
 * every retry, in which case a warning is recorded.
 */
export async function fetchTiles(
	args: FetchTilesArgs,
): Promise<ReadonlyMap<string, ArrayBuffer | null>> {
	const results = new Map<string, ArrayBuffer | null>();
	const pending: TileCoord[] = [];

	const keyFor = (coord: TileCoord): string =>
		`${args.source.id}/${tileKey(coord, args.opened.version)}`;

	for (const coord of args.coords) {
		const key = keyFor(coord);
		const cached = args.cache.get(key);

		if (cached === undefined) {
			pending.push(coord);
		} else {
			results.set(key, cached);
		}
	}

	let cursor = 0;

	const worker = async (): Promise<void> => {
		while (cursor < pending.length) {
			const coord = pending[cursor++];

			if (coord === undefined) {
				return;
			}

			const key = keyFor(coord);

			try {
				const buffer = await fetchWithRetry(args.opened, coord, args.signal);

				args.cache.set(key, buffer);
				results.set(key, buffer);
			} catch (error) {
				args.warn.warn("TILE_FETCH_FAILED", `Could not fetch tile ${key}.`, {
					key,
					cause: error instanceof Error ? error.message : String(error),
				});
				// Not cached: a transient failure should not poison later renders.
				results.set(key, null);
			}
		}
	};

	await Promise.all(
		Array.from({ length: Math.min(FETCH_CONCURRENCY, pending.length) }, worker),
	);

	return results;
}
