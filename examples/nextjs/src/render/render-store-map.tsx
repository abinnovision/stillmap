import { renderMap } from "@stillmap/react";
import { join } from "node:path";

import { renderKey } from "./key";
import { coalesce } from "./single-flight";
import { fileMapStore } from "./store";
import { StoreMap } from "../map/store-map";

import type { Store } from "../stores";
import type { MapStore, PngBytes } from "./store";

const SCALE = 2;

const defaultStore = fileMapStore(join(process.cwd(), ".cache/maps"));

export interface RenderStoreMapArgs {
	readonly store: Store;
	readonly width: number;
	readonly height: number;
	readonly cache?: MapStore;
}

export interface RenderedStoreMap {
	readonly bytes: PngBytes;
	readonly key: string;
	/** False when the bytes came from the cache, so the route can log it. */
	readonly rendered: boolean;
}

/** The cache key for a map, without rendering it. Also serves as its ETag. */
export function storeMapKey(args: RenderStoreMapArgs): string {
	return renderKey({
		storeId: args.store.id,
		updatedAt: args.store.updatedAt,
		width: args.width,
		height: args.height,
		scale: SCALE,
	});
}

/**
 * Cache lookup, then single-flight render, then write back. Three layers, in
 * the only order that makes sense: a hit costs a file read, a miss costs one
 * render no matter how many requests arrive at once.
 */
export async function renderStoreMap(
	args: RenderStoreMapArgs,
): Promise<RenderedStoreMap> {
	const cache = args.cache ?? defaultStore;
	const key = storeMapKey(args);

	const cached = await cache.get(key);

	if (cached !== null) {
		return { bytes: cached, key, rendered: false };
	}

	let rendered = false;

	const bytes = await coalesce(key, async () => {
		rendered = true;

		const result = await renderMap(
			<StoreMap store={args.store} width={args.width} height={args.height} />,
			{ format: "png", scale: SCALE },
		);

		for (const warning of result.warnings) {
			process.stdout.write(`stillmap ${warning.code}: ${warning.message}\n`);
		}

		/*
		 * Copies out of the Buffer rather than viewing it. A Buffer is a view
		 * into a shared pool slab, and this drops both that alias and the
		 * `ArrayBufferLike` type that keeps a Buffer out of `BodyInit`.
		 */
		const png: PngBytes = new Uint8Array(result.png);

		await cache.set(key, png);

		return png;
	});

	return { bytes, key, rendered };
}
