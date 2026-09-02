import { defineTileSource } from "@stillmap/core";
import { openFreeMap } from "@stillmap/sources";

import type { OpenTileSource, TileSource } from "@stillmap/core";

const DEFAULT_TTL_MS = 60 * 60 * 1000;

export interface MemoizedSourceOptions {
	readonly ttlMs?: number;
}

/**
 * `openFreeMap()` resolves its TileJSON over HTTP on every open, and the engine
 * opens the source once per render, so an uncached source puts a network round
 * trip on the critical path of every cold render.
 *
 * This memoizes the opened handle and delegates `fetchTile` untouched: no tile
 * bytes are stored here. The TTL is what keeps the provider's URL rotation
 * working as cache invalidation, being short next to a rotation and long next
 * to a request.
 */
export function memoizedOpenFreeMap(
	options: MemoizedSourceOptions = {},
): TileSource {
	const inner = openFreeMap();
	const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;

	let opened: { at: number; value: Promise<OpenTileSource> } | null = null;

	return defineTileSource({
		id: inner.id,
		schema: inner.schema,
		attribution: inner.attribution,
		open: async (context) => {
			const now = Date.now();

			if (opened === null || now - opened.at > ttlMs) {
				const value = inner.open(context);

				/*
				 * Drop a rejected handle so the next render retries rather than
				 * replaying the failure for a whole TTL.
				 */
				opened = { at: now, value };
				value.catch(() => {
					if (opened?.value === value) {
						opened = null;
					}
				});
			}

			return await opened.value;
		},
	});
}
